const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
test('search strategy covers languages, intent routes and shared site identity',()=>{
 const {strategy,website,audit}=require('../scripts/seo');
 const config=require('../site.config.json');
 assert.equal(Object.keys(strategy.languages).length,7);
 assert.equal(website(config).url,config.origin+'/');
 assert.ok(website(config).alternateName.includes('하루이메일'));
 const report=audit(path.join(root,'dist'),config.origin);
 assert.equal(report.pages.length,84);
 for(const [lang,settings] of Object.entries(strategy.languages)){
  const prefix=lang==='ko'?'':`/${lang}`;
  const home=report.pages.find(p=>p.path===prefix+'/');
  assert.equal(home.title,settings.homeTitle);
  assert.equal(home.intent,'create-temporary-inbox');
  for(const route of Object.keys(strategy.intents))assert.ok(report.pages.some(p=>p.path===prefix+route));
  for(const route of ['/','/guides/','/faq/']){
   const html=fs.readFileSync(path.join(root,'dist',prefix+route,'index.html'),'utf8');
   const nodes=[...html.matchAll(/application\/ld\+json">([^]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1])['@graph']);
   const page=nodes.find(n=>n['@type']==='WebPage');assert.equal(page.isPartOf['@id'],config.origin+'/#website');
   if(route==='/')assert.equal(nodes.find(n=>n['@type']==='WebSite')['@id'],config.origin+'/#website');
  }
  if(lang!=='ko'){
   const html=fs.readFileSync(path.join(root,'dist',prefix,'guides/missing-email-checklist/index.html'),'utf8');
   assert.match(html,/class="article-toc"/);assert.match(html,/aria-current="page"/);
  }
 }
});
