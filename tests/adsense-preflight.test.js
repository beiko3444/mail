const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,'dist',p),'utf8');
test('all public language variants expose ownership, practical guides and consistent retention',()=>{
 execFileSync(process.execPath,['scripts/build.js'],{cwd:root});
 for(const lang of ['', 'en/','ja/','es/','pt/','fr/','de/']){
  const home=read(lang+'index.html');
  assert.match(home,/<meta name="google-adsense-account" content="ca-pub-8288401260787220">/);
  assert.doesNotMatch(home,/adsbygoogle|googlesyndication/);
  const privacy=read(lang+'privacy/index.html');
  assert.match(privacy,/xtmail_session/);
  for(const guide of require('../content/guides.json')){
   const html=read(lang+'guides/'+guide.slug+'/index.html');
   assert.match(html,/class="sources"/);
   assert.match(html,/<section /);
   assert.doesNotMatch(html,/Resend|resend\.com|최대 30일/);
  }
 }
});
test('preflight distinguishes application gaps from ad activation and external approval',()=>{
 const {readiness}=require('../scripts/adsense-preflight');
 const report=readiness({supportEmail:'',operatorName:'',ads:{publisherId:'pub-8288401260787220',approved:false,consentReady:false,slotId:''}},{cmpInstalled:false});
 assert.equal(report.applicationReady,false);
 assert.equal(report.adServingReady,false);
 assert.ok(report.applicationGaps.some(x=>x.includes('support')));
 const complete=readiness({supportEmail:'help@example.com',operatorName:'Example',ads:{publisherId:'pub-8288401260787220',approved:false,consentReady:false,slotId:''}},{cmpInstalled:false});
 assert.equal(complete.applicationReady,true);
 assert.equal(complete.adServingReady,false);
 assert.equal(complete.googleApproval,'not confirmed');
 const invalid=readiness({supportEmail:'not-an-email',operatorName:' ',ads:{publisherId:'pub-8288401260787220',approved:true,consentReady:true,slotId:'1234567890'}},{cmpInstalled:true});
 assert.equal(invalid.applicationReady,false);
 assert.equal(invalid.adServingReady,false);
 assert.equal(invalid.applicationGaps.length,2);
});
