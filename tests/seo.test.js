const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..'),dist=path.join(root,'dist');
const guides=require('../content/guides.json');
const read=p=>fs.readFileSync(path.join(dist,p),'utf8');
const schemas=html=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>{const s=JSON.parse(m[1]);return s['@graph']||[s];});
test('public SEO metadata, structured data, discovery and anchors agree',()=>{
 execFileSync(process.execPath,['scripts/build.js'],{cwd:root,env:{...process.env,GOOGLE_SITE_VERIFICATION:''}});
 const home=read('index.html');
 assert.match(home,/<title>무료 임시메일·일회용 이메일 \| 하루메일<\/title>/);
 const websites=schemas(home).filter(s=>s['@type']==='WebSite');
 assert.equal(websites.length,1);assert.equal(websites[0].name,'하루메일');assert.equal(websites[0].url,'https://www.haruemail.com/');
 assert.doesNotMatch(home,/name="google-site-verification"/);
 assert.match(home,/<div[^>]*data-nosnippet[^>]*>[\s\S]*id="emailAddress"/);
 assert.match(home,/<div[^>]*data-nosnippet[^>]*>[\s\S]*id="messageList"/);
 for(const g of guides)assert.ok(home.includes('href="/guides/'+g.slug+'/"'));
 const titles=new Set(),descriptions=new Set();
 for(const file of fs.readdirSync(dist,{recursive:true}).filter(p=>p.endsWith('.html'))){
  const html=read(file);assert.equal([...html.matchAll(/<h1(?: |>)/g)].length,1,file);
  const title=html.match(/<title>(.*?)<\/title>/)[1],description=html.match(/name="description" content="([^"]+)"/)[1];
  const lang=html.match(/<html lang="([^"]+)"/)[1];
  assert.ok(!titles.has(lang+':'+title),file);titles.add(lang+':'+title);assert.ok(!descriptions.has(lang+':'+description),file);descriptions.add(lang+':'+description);
  for(const [,href] of html.matchAll(/href="([/#][^"]*)"/g)){
   const [url,anchor]=href.split('#');const target=url?read(url.endsWith('/')?url+'index.html':url):html;
   if(anchor)assert.ok(target.includes('id="'+anchor+'"'),file+' -> '+href);
  }
  if(file.startsWith('guides/')&&file!=='guides/index.html'){
   const crumb=schemas(html).find(s=>s['@type']==='BreadcrumbList');assert.equal(crumb.itemListElement.length,3);
   const visible=html.match(/<nav class="breadcrumb"[\s\S]*?<\/nav>/)[0];
   for(const item of crumb.itemListElement){assert.ok(visible.includes(item.name));assert.ok(visible.includes('href="'+new URL(item.item).pathname+'"'));}
   assert.match(html,/aria-label="목차"/);
   const related=html.match(/<aside class="related-guides"[\s\S]*?<\/aside>/)[0];
   const links=[...related.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);assert.ok(links.length>=2&&links.length<=3);assert.ok(!links.includes('/'+file.replace('index.html','')));
  }
 }
});
test('verification token is optional and HTML escaped',()=>{
 try{execFileSync(process.execPath,['scripts/build.js'],{cwd:root,env:{...process.env,GOOGLE_SITE_VERIFICATION:'test"><script>&'}});
 assert.ok(read('index.html').includes('name="google-site-verification" content="test&quot;&gt;&lt;script&gt;&amp;"'));
 }finally{execFileSync(process.execPath,['scripts/build.js'],{cwd:root});}
});
test('API responses are noindex and index aliases redirect to canonical paths',async()=>{
 const {createServer}=require('../server');const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{for(const route of ['/api/config','/api/messages','/api/nonexistent']){const res=await fetch(base+route);assert.match(res.headers.get('x-robots-tag'),/noindex/);}
 for(const route of ['/index.html','/guides/index.html','/guides/missing-email-checklist/index.html']){const res=await fetch(base+route,{redirect:'manual'});assert.equal(res.status,308);assert.equal(res.headers.get('location'),route.replace('index.html',''));}
 }finally{await new Promise(r=>{server.close(r);server.closeAllConnections();});}
});
