const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
process.env.MAILBOX_SECRET = 'pagination-fixture-key'.repeat(3);
const mailboxApi = require('../api/_lib/mailbox');

test('a bounded receiving scan resumes beyond the first 1,000 team messages', async () => {
  const now = Date.now();
  let clock = now;
  const calls = [];
  class FixedDate extends Date { static now() { return clock; } }
  const context = { module:{exports:{}}, process:{env:{RESEND_API_KEY:'fixture'}}, Date:FixedDate, URL,
    setTimeout(fn, ms) { clock += ms; fn(); }, AbortSignal:{timeout(){return {}; }},
    async fetch(url) {
      const after = new URL(url).searchParams.get('after'); calls.push(after);
      const start = after ? Number(after.slice(3)) + 1 : 0;
      const data = Array.from({length: Math.min(100, 1001-start)}, (_,index) => {
        const i=start+index; return {id:'id-'+i, to:[i===1000?'mine@example.org':'other@example.org'],created_at:new Date(now).toISOString()};
      });
      return {ok:true,text:async()=>JSON.stringify({data,has_more:start+data.length<1001})};
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../api/_lib/resend.js'),'utf8'),context);
  const receiving = context.module.exports;
  const first = await receiving.listReceivedMessages('mine@example.org',now-1000);
  assert.equal(first.messages.length,0); assert.equal(first.partial,true);
  assert.equal(first.nextAfter,'id-999');
  const second = await receiving.listReceivedMessages('mine@example.org',now-1000,first.nextAfter);
  assert.equal(second.messages[0]?.id,'id-1000'); assert.equal(second.partial,false);
  assert.equal(second.nextAfter,''); assert.equal(calls.length,11);
});

test('receiving continuation cannot be forged or moved to a different mailbox', () => {
  const first=mailboxApi.issueMailbox().mailbox, second=mailboxApi.issueMailbox().mailbox;
  assert.equal(typeof mailboxApi.issueScanCursor,'function');
  const token=mailboxApi.issueScanCursor('email-1000',first);
  assert.equal(mailboxApi.verifyScanCursor(token,first),'email-1000');
  assert.throws(()=>mailboxApi.verifyScanCursor(token,second));
  assert.throws(()=>mailboxApi.verifyScanCursor(token.slice(0,-8)+'aaaaaaaa',first));
  assert.throws(()=>mailboxApi.verifyToken(token));
  assert.equal(mailboxApi.verifyScanCursor(undefined,first),'');
});

test('the messages endpoint validates a cursor before provider access and signs its continuation', async () => {
  const issued=mailboxApi.issueMailbox(), other=mailboxApi.issueMailbox().mailbox;
  const token=mailboxApi.issueScanCursor('email-1000',issued.mailbox);
  let calls=0;
  const context={module:{exports:{}},require(name){
    if(name==='../_lib/mailbox') return mailboxApi;
    if(name==='../_lib/http') return require('../api/_lib/http');
    if(name==='../_lib/resend') return {async listReceivedMessages(address,since,after){
      calls++; assert.equal(address,issued.mailbox.address); assert.equal(after,'email-1000');
      return {messages:[],partial:true,nextAfter:'email-2000'};
    }};
    throw new Error('Unexpected module '+name);
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../api/messages/index.js'),'utf8'),context);
  const response=()=>({setHeader(){},end(value){this.body=JSON.parse(value);}});
  const request=cursor=>({method:'GET',headers:{cookie:'xtmail_session='+issued.token},query:{cursor}});
  const denied=response(); await context.module.exports(request(mailboxApi.issueScanCursor('email-1000',other)),denied);
  assert.equal(denied.statusCode,400); assert.equal(calls,0);
  const allowed=response(); await context.module.exports(request(token),allowed);
  assert.equal(allowed.statusCode,200); assert.equal(calls,1);
  assert.equal(mailboxApi.verifyScanCursor(allowed.body.nextCursor,issued.mailbox),'email-2000');
});
