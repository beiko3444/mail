const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const langs=['ko','en','ja','es','pt','fr','de'];
const route=(lang,suffix='')=>(lang==='ko'?'/':`/${lang}/`)+suffix;
const read=url=>fs.readFileSync(path.join(root,'dist',url,'index.html'),'utf8');
test('seven static language versions have reciprocal alternates and private inbox boundaries',()=>{
 execFileSync(process.execPath,['scripts/build.js'],{cwd:root});
 const sitemap=fs.readFileSync(path.join(root,'dist/sitemap.xml'),'utf8');
 for(const lang of langs){
  for(const suffix of ['', 'faq/','guides/','about/','privacy/','terms/','contact/','guides/missing-email-checklist/']){
   const url=route(lang,suffix),html=read(url);
   assert.match(html,new RegExp(`<html lang="${lang}">`));
   assert.ok(html.includes(`rel="canonical" href="https://www.haruemail.com${url}"`));
   for(const other of langs)assert.ok(html.includes(`hreflang="${other}" href="https://www.haruemail.com${route(other,suffix)}"`),url+' missing '+other);
   assert.ok(html.includes(`hreflang="x-default" href="https://www.haruemail.com${route('en',suffix)}"`));
   assert.ok(sitemap.includes(`<loc>https://www.haruemail.com${url}</loc>`));
   if(lang!=='ko')assert.doesNotMatch(html.replaceAll('한국어',''),/[가-힣]/,url+' untranslated Korean');
  }
  const home=read(route(lang));
  assert.match(home,/data-nosnippet/);assert.match(home,/id="createBtn"/);
  assert.match(home,/class="language-links"/);
  assert.doesNotMatch(home,/http-equiv="refresh"|navigator.language|meta name="keywords"/);
 }
 assert.doesNotMatch(sitemap,/\/api\/|\?address=|404.html/);
});
