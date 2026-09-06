const test = require('node:test');
const assert = require('node:assert/strict');
process.env.RESEND_API_KEY = 'test-key';
process.env.MAILBOX_SECRET = 'test-secret'.repeat(4);
const { issueMailbox } = require('../api/_lib/mailbox');
const receiving = require('../api/_lib/resend');
function response(value) { return { ok: true, status: 200, text: async () => JSON.stringify(value) }; }
function res() { return { headers:{}, setHeader(k,v){this.headers[k]=v;}, end(s){this.body=JSON.parse(s);} }; }
test('receiving follows pagination and finds messages beyond first 100; caches shared pages', async () => {
  let calls = 0;
  const now = Date.now();
  const original = global.fetch;
  global.fetch = async url => {
    calls++;
    return response(String(url).includes('after=') ? {has_more:false,data:[{id:'own',to:['mine@example.org'],created_at:new Date(now).toISOString(),subject:'Own'}]} : {has_more:true,data:[{id:'other',to:['other@example.org'],created_at:new Date(now).toISOString()}]});
  };
  try {
    const result = await receiving.listReceivedMessages('mine@example.org', now - 1000);
    assert.deepEqual(result.messages.map(x => x.id), ['own']);
    assert.equal(result.partial, false);
    await receiving.listReceivedMessages('other@example.org', now - 1000);
    assert.equal(calls, 2);
  } finally { global.fetch = original; }
});
test('message endpoints reject unauthenticated access before calling provider', async () => {
  const original = global.fetch;
  global.fetch = async () => { throw new Error('must not call provider'); };
  try {
    for (const handler of [require('../api/messages'),require('../api/messages/[id]')]) {
      const output = res(); await handler({method:'GET',headers:{},query:{id:'id',address:'victim@example.org'}},output);
      assert.equal(output.statusCode,401);
      assert.equal(output.headers['Cache-Control'],'no-store');
    }
  } finally {global.fetch = original;}
});
test('a valid mailbox cannot open another mailbox message and no HTML is exposed', async () => {
  const original = global.fetch;
  const { mailbox, token } = issueMailbox();
  const handler = require('../api/messages/[id]');
  try {
    global.fetch = async () => response({id:'id', to:['victim@example.org'],created_at:new Date().toISOString(),text:'secret'});
    const req = {method:'GET',headers:{cookie:`xtmail_session=${token}`},query:{id:'id'}};
    const forbidden = res(); await handler(req,forbidden);
    assert.equal(forbidden.statusCode,404); assert.doesNotMatch(JSON.stringify(forbidden.body),/secret/);
    global.fetch = async () => response({id:'id',to:[mailbox.address],created_at:new Date().toISOString(),text:'123456',html:'<script>evil()</script>'});
    const own = res(); await handler(req,own);
    assert.equal(own.statusCode,200); assert.equal(own.body.text,'123456'); assert.equal(own.body.html,undefined);
  } finally {global.fetch = original;}
});

test('HTML-only emails retain safe verification destinations as plain text', async () => {
  const original = global.fetch;
  const { mailbox, token } = issueMailbox();
  try {
    global.fetch = async () => response({ id:'html-link', to:[mailbox.address], created_at:new Date().toISOString(), text:null,
      html:'<p>안녕하세요</p><a href="https://example.org/verify?token=abc&amp;source=email"><strong>이메일 인증하기</strong></a><a href="&#106;avascript:alert(1)">위험한 링크</a><script>evil()</script><img src="https://tracker.example.org/pixel">' });
    const output = res();
    await require('../api/messages/[id]')({ method:'GET', headers:{cookie:`xtmail_session=${token}`}, query:{id:'html-link'} }, output);
    assert.equal(output.statusCode, 200);
    assert.match(output.body.text, /https:\/\/example\.org\/verify\?token=abc&source=email/);
    assert.match(output.body.text, /이메일 인증하기/);
    assert.doesNotMatch(output.body.text, /javascript:|alert\(1\)|evil\(\)|tracker\.example/);
    assert.equal(output.body.html, undefined);
  } finally { global.fetch = original; }
});
