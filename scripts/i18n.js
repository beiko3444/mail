const fs=require('node:fs');
const path=require('node:path');
const languages=[['ko','한국어','ko-KR','ko_KR'],['en','English','en','en_US'],['ja','日本語','ja','ja_JP'],['es','Español','es','es_ES'],['pt','Português','pt','pt_BR'],['fr','Français','fr','fr_FR'],['de','Deutsch','de','de_DE']];
const guideSpecs=[
 ['temporary-email-and-privacy','guidePrivacy','limitsBody'],
 ['temporary-email-alias-or-inbox','guideAlias','limitsBody'],
 ['missing-email-checklist','guideMissing','guideMissingNext'],
 ['responsible-email-testing','guideTesting','guideTestingNext'],
 ['phishing-and-remote-tracking','guidePhishing','guidePhishingNext']
];
function catalogs(root){
 const result=Object.fromEntries(languages.map(([lang])=>[lang,{}]));
 for(const filename of ['ui.tsv','content.tsv','guide-details.tsv'])for(const line of fs.readFileSync(path.join(root,'content/locales',filename),'utf8').split(/\r?\n/).filter(Boolean)){
  const [key,...values]=line.split('|');
  if(values.length!==6 || values.some(v=>!v))throw new Error(`Incomplete translation: ${key}`);
  languages.slice(1).forEach(([lang],i)=>{if(key in result[lang])throw new Error(`Duplicate translation: ${key}`);result[lang][key]=values[i];});
  result.ko[key]=key;
 }
 return result;
}
const guideDetails={
 'temporary-email-and-privacy':[['practicalHeading','privacyExample'],['retentionHeading','retentionExample']],
 'temporary-email-alias-or-inbox':[['aliasHeading','aliasExample'],['recoveryHeading','recoveryExample']],
 'missing-email-checklist':[['missingHeading','missingExample'],['missingEvidenceHeading','missingEvidence']],
 'responsible-email-testing':[['testingHeading','testingExample'],['testingLimitsHeading','testingLimits']],
 'phishing-and-remote-tracking':[['phishingHeading','phishingExample'],['phishingActionHeading','phishingAction']]
};
const sourceLabels={
 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie':'MDN: Set-Cookie',
 'https://developers.cloudflare.com/email-routing/':'Cloudflare: Email Routing',
 'https://support.apple.com/en-us/105078':'Apple: Hide My Email',
 'https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html':'OWASP: Forgot Password Cheat Sheet',
 'https://consumer.ftc.gov/articles/how-recognize-avoid-phishing-scams':'FTC: How to Recognize and Avoid Phishing Scams',
 'https://support.mozilla.org/en-US/kb/remote-content-in-messages':'Mozilla: Remote Content in Messages'
};
const localRoute=(lang,route)=>lang==='ko'?route:`/${lang}${route}`;
function languageLinks(lang,route,escape,label){
 return `<nav class="language-links" aria-label="${escape(label || '언어')}">${languages.map(([code,name])=>`<a href="${localRoute(code,route)}" lang="${code}" hreflang="${code}"${code===lang?' aria-current="page"':''}>${escape(name)}</a>`).join('')}</nav>`;
}
function alternates(origin,route){return languages.map(([lang])=>`<link rel="alternate" hreflang="${lang}" href="${origin+localRoute(lang,route)}">`).join('\n')+`\n<link rel="alternate" hreflang="x-default" href="${origin+localRoute('en',route)}">`;}
function buildLocales({root,dist,config,escape,verificationMarkup,koreanRoutes}){
 const all=catalogs(root),routes=[];
 const jsonLd=nodes=>`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':nodes}).replaceAll('<','\\u003c')}</script>`;
 const inboxSource=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const appSource=fs.readFileSync(path.join(root,'app.js'),'utf8');
 for(const [lang,,intl,og] of languages.slice(1)){
  const data=all[lang],t=key=>{if(!(key in data))throw new Error(`Missing ${lang}: ${key}`);return data[key];};
  const e=key=>escape(t(key)),url=route=>localRoute(lang,route);
  const p=key=>`<p>${e(key)}</p>`;
  function layout(title,description,body,route,type='page',extra=[]){
   const fullTitle=route==='/'?title:`${title} | HaruMail`;
   const nodes=[{'@type':'Organization','@id':config.origin+'/#organization',name:'HaruMail',url:config.origin+'/en/about/'},{'@type':'WebPage','@id':config.origin+url(route)+'#webpage',url:config.origin+url(route),name:fullTitle,description,inLanguage:lang},...extra];
   if(route==='/')nodes.push({'@type':'WebSite','@id':config.origin+'/en/#website',name:'HaruMail',url:config.origin+'/en/',inLanguage:languages.map(x=>x[0])});
   return `<!doctype html><html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escape(fullTitle)}</title><meta name="description" content="${escape(description)}"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#245cdb"><link rel="canonical" href="${config.origin+url(route)}">${alternates(config.origin,route)}<meta property="og:type" content="${type==='guide'?'article':'website'}"><meta property="og:locale" content="${og}"><meta property="og:site_name" content="HaruMail"><meta property="og:title" content="${escape(fullTitle)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${config.origin+url(route)}"><meta name="twitter:card" content="summary">${verificationMarkup}${config.ads.publisherId?`<meta name="google-adsense-account" content="ca-${escape(config.ads.publisherId)}">`:""}<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css">${jsonLd(nodes)}</head><body data-page-type="${type}"><a class="skip-link" href="#main">${e('본문으로 건너뛰기')}</a><header class="site-header"><div class="header-inner"><a class="brand" href="${url('/')}"><span class="brand-mark" aria-hidden="true">✉</span>HaruMail</a><nav class="header-links" aria-label="${e('주 메뉴')}"><a href="${url('/guides/')}">${e('이용 가이드')}</a><a href="${url('/faq/')}">${e('자주 묻는 질문')}</a></nav></div>${languageLinks(lang,route,escape,t('언어'))}</header><div class="site-body">${body}<footer class="site-footer"><div class="container"><div class="footer-top"><a href="${url('/')}" class="footer-brand">HaruMail</a><nav class="footer-links" aria-label="${e('서비스 안내')}">${[['about','서비스 소개'],['contact','문의'],['privacy','개인정보처리방침'],['terms','이용약관']].map(([r,k])=>`<a href="${url('/'+r+'/')}">${e(k)}</a>`).join('')}</nav></div><p class="footer-bottom">© 2026 HaruMail · ${e('footer')}</p></div></footer></div></body></html>`;
  }
  function save(route,title,description,body,type,extra){const local=url(route);fs.mkdirSync(path.join(dist,local),{recursive:true});fs.writeFileSync(path.join(dist,local,'index.html'),layout(title,description,body,route,type,extra));routes.push(local);}
  function document(title,description,body){return `<main id="main" class="container page-main"><header class="page-heading"><h1>${escape(title)}</h1><p>${escape(description)}</p></header><article class="article-body">${body}</article></main>`;}
  const guideLinks=guideSpecs.map(([slug,key])=>`<a href="${url('/guides/'+slug+'/')}"><span>${e(key+'Title')}</span><span aria-hidden="true">↗</span></a>`).join('');
  let mailbox=inboxSource.slice(0,inboxSource.indexOf('  <section class="public-intro'));
  mailbox=mailbox.replace(/<h1>[\s\S]*?<\/h1>/,`<h1>${e('homeH1')}</h1>`)
   .replace('주소를 복사해 사용하고, 도착한 메일을 확인하세요.',e('homeLead'))
   .replace('위에서 무료 주소를 만들면<br>도착한 메일을 여기서 확인할 수 있어요.',e('위에서 무료 주소를 만들면 도착한 메일을 여기서 확인할 수 있어요.'))
   .replace('회원가입 없이, 몇 번의 클릭만으로',e('가입 없이 · 무료로 · 24시간'))
   .replace(/<div class="privacy-note">[\s\S]*?<\/div>/,`<div class="privacy-note"><p>${e('cookieNote')} <a href="/privacy/#retention">${e('보관 안내')}</a></p></div>`);
  let dialogs=inboxSource.slice(inboxSource.indexOf('  <dialog id="confirmDialog"'),inboxSource.indexOf('  <noscript>'));
  dialogs=dialogs.replace('기존 메일함의 접근 정보가 이 브라우저에서 사라집니다. 수신 업체에 보관된 원본 메일까지 즉시 삭제되는 것은 아닙니다.',e('현재 주소와 받은 메일을 이 브라우저에서 다시 열 수 없어요. 필요한 내용을 먼저 확인해 주세요. 수신 업체의 원본 메일까지 즉시 삭제되지는 않습니다.'));
  const translateMarkup=html=>{
   for(const key of Object.keys(data).filter(k=>/[가-힣]/.test(k)).sort((a,b)=>b.length-a.length))html=html.split(key).join(escape(data[key]));
   return html.replace(/href="\/(guides|privacy|faq)\//g,`href="/${lang}/$1/`);
  };
  mailbox=translateMarkup(mailbox);dialogs=translateMarkup(dialogs);
  const body=mailbox+`<section class="public-intro article-body" aria-labelledby="temporary-email-title"><h2 id="temporary-email-title">${e('introTitle')}</h2>${p('introBody')}${p('limitsBody')}</section><section class="how-it-works"><div class="section-heading"><h2>${e('이렇게 사용하세요')}</h2></div><ol class="steps">${[['주소 만들기','가입 없이 임시 이메일을 발급받아요.'],['필요한 곳에 사용하기','주소를 복사해 메일을 받을 곳에 입력해요.'],['도착한 메일 확인하기','받은편지함에서 내용을 바로 확인해요.']].map(([a,b],i)=>`<li><span class="step-number">0${i+1}</span><div><h3>${e(a)}</h3>${p(b)}</div></li>`).join('')}</ol></section><section class="home-guide"><div><h2>${e('이용 가이드')}</h2>${p('guidesDescription')}</div><div class="guide-links">${guideLinks}<a href="${url('/faq/')}">${e('자주 묻는 질문')}</a></div></section><section class="home-faq article-body"><h2>${e('faqFakeQ')}</h2>${p('faqFakeA')}<h2>${e('faqTenQ')}</h2>${p('faqTenA')}</section>${dialogs}<noscript><p class="no-script">${e('noScript')}</p></noscript></main><script src="/${lang}/app.js" defer></script>`;
  save('/',t('homeTitle'),t('homeDescription'),body,'inbox');
  const cards=guideSpecs.map(([slug,key])=>`<article class="article-card"><h2><a href="${url('/guides/'+slug+'/')}">${e(key+'Title')}</a></h2>${p(key+'Description')}</article>`).join('');
  save('/guides/',t('이용 가이드'),t('guidesDescription'),document(t('이용 가이드'),t('guidesDescription'),`<div class="article-grid">${cards}</div>`));
  for(const [slug,key,next] of guideSpecs){
   const route='/guides/'+slug+'/',title=t(key+'Title'),description=t(key+'Description');
   const crumbs=[{name:t('홈'),path:url('/')},{name:t('이용 가이드'),path:url('/guides/')},{name:title,path:url(route)}];
   const related=guideSpecs.filter(x=>x[0]!==slug).slice(0,3).map(([s,k])=>`<li><a href="${url('/guides/'+s+'/')}">${e(k+'Title')}</a></li>`).join('');
   const sections=guideDetails[slug].map(([h,b],i)=>`<section id="detail-${i+1}"><h2>${e(h)}</h2>${p(b)}</section>`).join('');
   const sourceGuide=require('../content/guides.json').find(g=>g.slug===slug);
   const sources=`<div class="sources"><h2>${e('sourcesHeading')}</h2><ul>${sourceGuide.sources.map(source=>{const local=source.url.startsWith(config.origin+'/');const href=local?url(new URL(source.url).pathname)+new URL(source.url).hash:source.url;const label=local?t('개인정보처리방침'):(sourceLabels[source.url]||new URL(source.url).hostname+': '+new URL(source.url).pathname.split('/').filter(Boolean).pop().replaceAll('-',' '));return `<li><a href="${escape(href)}" rel="noopener noreferrer">${escape(label)}</a></li>`;}).join('')}</ul></div>`;
   const content=`<nav class="breadcrumb" aria-label="${e('홈')}">${crumbs.map(c=>`<a href="${c.path}">${escape(c.name)}</a>`).join(' / ')}</nav><p class="article-meta">HaruMail · ${e('updated')}</p>${p(key+'Body')}${p(next)}${sections}<h2>${e('editorialHeading')}</h2>${p('editorialBody')}${sources}<aside class="related-guides"><h2>${e('관련 가이드')}</h2><ul>${related}</ul></aside><p><a href="${url('/')}">${e('무료 주소 만들기')}</a></p>`;
   const schema=[{'@type':'Article',headline:title,description,datePublished:'2026-09-07',dateModified:'2026-09-07',inLanguage:lang,author:{'@id':config.origin+'/#organization'},publisher:{'@id':config.origin+'/#organization'},mainEntityOfPage:{'@id':config.origin+url(route)+'#webpage'}},{'@type':'BreadcrumbList',itemListElement:crumbs.map((c,i)=>({'@type':'ListItem',position:i+1,name:c.name,item:config.origin+c.path}))}];
   save(route,title,description,document(title,description,content),'guide',schema);
  }
  const faq=['Free','Time','Fake','Ten','Sites','Send'].map(k=>`<details><summary>${e('faq'+k+'Q')}</summary>${p('faq'+k+'A')}</details>`).join('');
  save('/faq/',t('자주 묻는 질문'),t('faqDescription'),document(t('자주 묻는 질문'),t('faqDescription'),`<div class="faq-list">${faq}</div><p><a href="${url('/guides/missing-email-checklist/')}">${e('guideMissingTitle')}</a></p>`));
  const info={about:['서비스 소개',p('aboutBody')+p('introBody')+p('limitsBody')+`<h2>${e('editorialHeading')}</h2>`+p('editorialBody')+(config.operatorName?`<p>${e('operatorLabel')}: ${escape(config.operatorName)}</p>`:'')],contact:['문의',p('contactBody')+p('contactDetails')+(config.operatorName?`<p>${e('operatorLabel')}: ${escape(config.operatorName)}</p>`:'')+(config.supportEmail?`<p><a href="mailto:${escape(config.supportEmail)}">${escape(config.supportEmail)}</a></p>`:p('contactPending'))],privacy:['개인정보처리방침',`<p>${e('updated')}</p>`+(config.operatorName?`<p>${e('operatorLabel')}: ${escape(config.operatorName)}</p>`:'')+(config.supportEmail?`<p><a href="mailto:${escape(config.supportEmail)}">${escape(config.supportEmail)}</a></p>`:'')+['Data','Retention','Providers','Ads'].map(k=>`<h2${k==='Retention'?' id="retention"':''}>${e('privacy'+k+'Title')}</h2>${p('privacy'+k+'Body')}${k==='Data'?p('cookieDetails'):''}`).join('')+`<p><a href="https://www.cloudflare.com/privacypolicy/">Cloudflare</a> · <a href="https://supabase.com/privacy">Supabase</a> · <a href="https://vercel.com/legal/privacy-policy">Vercel</a></p>`],terms:['이용약관',`<p>${e('updated')}</p>`+p('introBody')+p('limitsBody')+p('termsBody')+p('termsLimits')]};
  for(const [route,[key,content]] of Object.entries(info))save('/'+route+'/',t(key),t(route+'Description'),document(t(key),t(route+'Description'),content+`<p><a href="${url('/privacy/')}">${e('개인정보처리방침')}</a> · <a href="${url('/contact/')}">${e('문의')}</a></p>`));
  // Compile literals only: message content from senders is never translated or inserted as HTML.
  let app=appSource.replace(/'([^'\n]*[가-힣][^'\n]*)'/g,(_,value)=>JSON.stringify(t(value))).replaceAll("'ko-KR'",JSON.stringify(intl));
  app=app.replace(/typeof payload.error === 'string' \? payload.error : ("(?:[^"\\]|\\.)*")/, `response.status === 429 ? ${JSON.stringify(t('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'))} : response.status === 403 ? ${JSON.stringify(t('요청을 허용할 수 없습니다. 페이지를 새로고침해 주세요.'))} : response.status === 401 ? ${JSON.stringify(t('메일함 접근을 확인할 수 없어요. 새로 확인해 주세요.'))} : $1`);
  app=app.replace('{ status: response.status }','{ status: response.status, localized: true }');
  // All network/provider errors shown to visitors use a translated message; raw backend errors may be Korean.
  app=app.replaceAll('error.message',`(error.localized ? error.message : ${JSON.stringify(t('연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.'))})`);
  fs.writeFileSync(path.join(dist,lang,'app.js'),app);
 }
 for(const route of koreanRoutes){const file=path.join(dist,route,'index.html');let html=fs.readFileSync(file,'utf8');html=html.replace('</head>',alternates(config.origin,route)+'\n</head>').replace('</header>','</header>'+languageLinks('ko',route,escape));fs.writeFileSync(file,html);}
 return routes;
}
module.exports={buildLocales,catalogs,languages,localRoute};
