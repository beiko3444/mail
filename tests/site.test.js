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
  assert.match(celebration, /const clear = event => \{[^]*?if \(event && event\.target !== mailboxCard\) return;[^]*?mailboxCard\.classList\.remove\('mailbox-issued'\)/);
  assert.match(celebration, /mailboxCard\.addEventListener\('animationend', clear\)/);
  assert.match(celebration, /mailboxCard\.removeEventListener\('animationend', clear\)/);
  assert.match(celebration, /setTimeout\(clear, 1200\)/);

  const mutate = app.match(/async function mutate\(method\) \{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(mutate, 'mutate() should exist');
  assert.match(mutate, /const payload = await request\('\/api\/mailbox', method\);\s*setMailbox\(payload\.mailbox\);\s*if \(method === 'POST'\) celebrateMailbox\(\);/);
  assert.doesNotMatch(app.match(/async function restore\(\) \{([\s\S]*?)\n  \}/)?.[1] || '', /celebrateMailbox\(/);
  assert.equal((app.match(/celebrateMailbox\(\)/g) || []).length, 2, 'celebration should only be defined and invoked once');
});
test('mailbox issuance motion is scoped, sequenced, and disabled for reduced motion', () => {
  const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const issued = styles.match(/\.mailbox-card\.mailbox-issued\{([^}]*)\}/)?.[1];
  assert.ok(issued, 'mailbox-issued card styling should exist');
  assert.match(issued, /animation\s*:\s*mailbox-arrival\s+\.78s/,
    'the card animation must outlast the delayed copy pulse so animationend cannot clear it early');
  assert.match(styles, /\.mailbox-card\.mailbox-issued\s+\.address-box\{[^}]*animation\s*:\s*address-reveal/);
  assert.match(styles, /\.mailbox-card\.mailbox-issued\s+\.copy-button\{[^}]*animation\s*:\s*copy-pulse/);
  for (const name of ['mailbox-arrival', 'address-reveal', 'copy-pulse']) {
    assert.match(styles, new RegExp(`@keyframes\\s+${name}`));
  }
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{[^}]*\.mailbox-card\.mailbox-issued(?:\s*,[^}]*)?\{[^}]*animation\s*:\s*none/);
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
  assert.match(sitemap,/<loc>https:\/\/www.haruemail.com\/guides\//);
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
