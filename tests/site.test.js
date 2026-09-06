const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname,'..');
test('mailbox issuance celebration adds and clears its completion state', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const celebration = app.match(/function celebrateMailbox\(\) \{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(celebration, 'celebrateMailbox() should exist');
  assert.match(celebration, /mailboxCard\.classList\.add\('mailbox-issued'\)/);
  assert.match(celebration, /mailboxCard\.addEventListener\('animationend', clear, \{ once: true \}\)/);
  assert.match(celebration, /const clear = \(\) => \{[^]*?mailboxCard\.classList\.remove\('mailbox-issued'\)/);
  assert.match(celebration, /setTimeout\(clear, 1200\)/);
});
test('public build is crawlable, linked, and never ships API source or secrets', () => {
  execFileSync(process.execPath,['scripts/build.js'],{cwd:root});
  const dist = path.join(root,'dist');
  const inbox = fs.readFileSync(path.join(dist,'index.html'),'utf8');
  assert.match(inbox,/id="createBtn"/);
  assert.match(inbox,/개인정보처리방침/);
  assert.doesNotMatch(inbox,/adsbygoogle|googlesyndication|data-ad-slot/);
  for (const p of ['.env','api','server.js','data','tests','site.config.json']) assert.equal(fs.existsSync(path.join(dist,p)),false,p);
  const sitemap = fs.readFileSync(path.join(dist,'sitemap.xml'),'utf8');
  assert.match(sitemap,/<loc>https:\/\/xtmail.vercel.app\/guides\//);
  assert.doesNotMatch(sitemap,/\/api\//);
  const files = fs.readdirSync(dist,{recursive:true}).filter(p=>p.endsWith('.html'));
  assert.ok(files.length >= 12);
  for (const file of files) {
    const html = fs.readFileSync(path.join(dist,file),'utf8');
    assert.match(html,/<html lang="ko">/);
    assert.match(html,/<title>[^<]+<\/title>/);
    assert.match(html,/<meta name="description" content="[^"]+"/);
    for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) {
      const target = path.join(dist,href.endsWith('/')?href+'index.html':href);
      assert.ok(fs.existsSync(target),file+' -> '+href);
    }
  }
});
test('ads require a real publisher, an approved account, and consent configuration', () => {
  const ads = require('../scripts/ads-policy');
  assert.equal(ads.canShowAds('/',{approved:true,consentReady:true,publisherId:'pub-1234567890123456'}),false);
  assert.equal(ads.canShowAds('/privacy/',{approved:true,consentReady:true,publisherId:'pub-1234567890123456'}),false);
  assert.equal(ads.canShowAds('/guides/temporary-email/',{approved:false,consentReady:true,publisherId:'pub-1234567890123456'}),false);
  assert.equal(ads.canShowAds('/guides/temporary-email/',{approved:true,consentReady:false,publisherId:'pub-1234567890123456'}),false);
  assert.equal(ads.canShowAds('/guides/temporary-email-and-privacy/',{approved:true,consentReady:true,publisherId:'pub-1234567890123456',slotId:'1234567890'}),true);
  assert.equal(ads.canShowAds('/guides/not-a-real-article/',{approved:true,consentReady:true,publisherId:'pub-1234567890123456',slotId:'1234567890'}),false);
  assert.throws(()=>ads.validatePublisher('pub-0000000000000000'));
});
