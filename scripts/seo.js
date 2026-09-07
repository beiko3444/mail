const fs=require('node:fs');
const path=require('node:path');
const strategy=require('../content/seo-strategy.json');
const codes=['ko','en','ja','es','pt','fr','de'];
if(Object.keys(strategy.languages).sort().join()!==[...codes].sort().join())throw new Error('SEO strategy must cover all seven languages.');
for(const [lang,value] of Object.entries(strategy.languages)){
 for(const key of ['primary','homeTitle','guidesTitle','faqTitle','toc'])if(typeof value[key]!=='string'||!value[key].trim())throw new Error(`Missing SEO ${lang}.${key}`);
 if(!value.homeTitle.toLocaleLowerCase().includes(value.primary.toLocaleLowerCase()))throw new Error(`Homepage title must describe the primary intent: ${lang}`);
}
function website(config){return {'@type':'WebSite','@id':config.origin+'/#website',name:config.name,alternateName:['HaruMail','하루이메일'],url:config.origin+'/',inLanguage:codes,publisher:{'@id':config.origin+'/#organization'}};}
function title(lang,route,fallback){const data=strategy.languages[lang];return route==='/'?data.homeTitle:route==='/guides/'?data.guidesTitle:route==='/faq/'?data.faqTitle:fallback;}
function decode(value){return value.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');}
function audit(dist,origin){
 const urls=[...fs.readFileSync(path.join(dist,'sitemap.xml'),'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(decode(m[1])));
 const pages=[];
 const fail=message=>{throw new Error('SEO audit: '+message);};
 const paths=new Set(urls.map(u=>u.pathname));
 if(paths.size!==urls.length)fail('Duplicate sitemap URL.');
 for(const url of urls){
  if(url.origin!==origin||url.search||url.hash||url.pathname.includes('/api/'))fail('Unexpected public URL '+url);
  const html=fs.readFileSync(path.join(dist,url.pathname,'index.html'),'utf8');
  const lang=html.match(/<html lang="([^"]+)"/)?.[1];
  if(!codes.includes(lang))fail('Unknown language '+url);
  const route=lang==='ko'?url.pathname:url.pathname.replace(new RegExp('^/'+lang+'/'),'/');
  if(lang!=='ko'&&!url.pathname.startsWith('/'+lang+'/'))fail('Language/path mismatch '+url);
  const canonical=decode(html.match(/rel="canonical" href="([^"]+)"/)?.[1]||'');
  if(canonical!==url.href)fail('Canonical mismatch '+url);
  if(/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/.test(html))fail('Public sitemap page is noindex '+url);
  const pageTitle=decode(html.match(/<title>(.*?)<\/title>/)?.[1]||'');
  const description=decode(html.match(/name="description" content="([^"]+)"/)?.[1]||'');
  if(!pageTitle||!description)fail('Missing title/description '+url);
  for(const code of [...codes,'x-default']){
   const target=code==='x-default'?'en':code;
   const expected=origin+(target==='ko'?'':'/'+target)+route;
   if(!html.includes(`hreflang="${code}" href="${expected}"`))fail('Alternate mismatch '+url+' '+code);
   if(!paths.has(new URL(expected).pathname))fail('Alternate missing from sitemap '+expected);
  }
  pages.push({path:url.pathname,language:lang,intent:strategy.intents[route]||'service-information',title:pageTitle,description,canonical});
 }
 for(const code of codes)for(const route of Object.keys(strategy.intents))if(!paths.has((code==='ko'?'':'/'+code)+route))fail('Missing intent route '+code+route);
 return {scope:'Static metadata and discovery audit, not a ranking forecast.',pages};
}
module.exports={strategy,website,title,audit};
if(require.main===module)console.log(JSON.stringify(audit(path.join(__dirname,'../dist'),require('../site.config.json').origin),null,2));
