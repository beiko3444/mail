const fs = require('node:fs');
const path = require('node:path');
const config = require('../site.config.json');
const guides = require('../content/guides.json');
const faq = require('../content/faq.json');
const { canShowAds, validatePublisher } = require('./ads-policy');
const root = path.join(__dirname,'..');
const dist = path.join(root,'dist');
function escape(value) { return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
const origin = new URL(process.env.SITE_ORIGIN || config.origin);
if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('SITE_ORIGIN must be an HTTPS origin, without a path.');
config.origin=origin.origin;
config.supportEmail=process.env.SUPPORT_EMAIL || config.supportEmail;
config.ads.publisherId=process.env.ADSENSE_PUBLISHER_ID || config.ads.publisherId;
if (config.supportEmail && !/^[a-zA-Z0-9.!#$%&'*+\-/=?^_`{|}~]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(config.supportEmail)) throw new Error('Invalid support email.');
if (config.ads.publisherId) validatePublisher(config.ads.publisherId);
const cmpFile=path.join(root,'content/cmp-snippet.html');
const cmp=fs.existsSync(cmpFile)?fs.readFileSync(cmpFile,'utf8'):'';
if (config.ads.approved && (!config.ads.consentReady || !cmp.trim() || !/^\d{10}$/.test(config.ads.slotId))) throw new Error('Before ads, install the actual certified CMP snippet, verify its messages and set a real manual ad slot.');
const pages=require('../content/pages')(config,escape);
const routes=[];
function layout(title,description,body,route,type='page',extra='') {
  const ads=type==='guide' && canShowAds(route,config.ads);
  const nav=[['/','임시메일'],['/guides/','이용 가이드'],['/faq/','자주 묻는 질문']];
  const current=p=>p==='/'?route==='/':route.startsWith(p);
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escape(title)} | XT Mail</title>
<meta name="description" content="${escape(description)}">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#142235">
<link rel="canonical" href="${escape(config.origin+route)}">
<meta property="og:type" content="${type==='guide'?'article':'website'}">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${escape(title)} | XT Mail">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(config.origin+route)}">
${config.ads.publisherId?`<meta name="google-adsense-account" content="ca-${config.ads.publisherId}">`:''}
${type==='error'?'<meta name="robots" content="noindex">':''}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/styles.css">
${ads?cmp:''}
${extra}
</head>
<body data-page-type="${type}">
<a class="skip-link" href="#main">본문으로 건너뛰기</a>
<header class="site-header"><div class="container header-inner"><a class="brand" href="/" aria-label="XT Mail 홈"><span class="brand-mark" aria-hidden="true">✉</span>XT MAIL<small>무료 임시 이메일</small></a><nav class="site-nav" aria-label="주 메뉴">${nav.map(([p,n])=>`<a href="${p}"${current(p)?' aria-current="page"':''}>${n}</a>`).join('')}</nav></div></header>
${body}
<footer class="site-footer"><div class="container"><div class="footer-top"><a href="/" class="footer-brand">XT MAIL</a><nav class="footer-links" aria-label="서비스 안내"><a href="/about/">서비스 소개</a><a href="/contact/">문의</a><a href="/privacy/">개인정보처리방침</a><a href="/terms/">이용약관</a></nav></div><p class="footer-bottom">© 2026 XT Mail · 무료 수신 서비스 · 중요한 계정에는 계속 사용할 수 있는 이메일을 이용하세요.</p></div></footer>
${ads?'<script src="/ads.js" defer></script>':''}
</body></html>`;
}
function save(route,html) {
 const target=path.join(dist,route==='/'?'index.html':route.replace(/^\//,'')+'index.html');
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,html);routes.push(route);
}
function heading(title,description) {return `<header class="page-heading"><span class="eyebrow ink">XT MAIL GUIDE</span><h1>${escape(title)}</h1><p>${escape(description)}</p></header>`;}
function documentPage(page) {return `<main id="main" class="container page-main">${heading(page.title,page.description)}<article class="article-body">${page.body}</article></main>`;}
fs.rmSync(dist,{recursive:true,force:true});fs.mkdirSync(dist,{recursive:true});
for(const name of ['styles.css','app.js','ads.js','favicon.svg'])fs.copyFileSync(path.join(root,name),path.join(dist,name));
save('/',layout('무료 임시 이메일 — 가입 없이 메일 받기','가입 없이 무료 임시 이메일을 만들고 수신 메일을 확인하세요. 브라우저별 접근 보호, 24시간 이용, 텍스트 본문 읽기를 제공합니다.',fs.readFileSync(path.join(root,'index.html'),'utf8'),'/', 'inbox'));
const cards=guides.map(g=>`<article class="article-card"><span class="category">${escape(g.category)}</span><h2><a href="/guides/${g.slug}/">${escape(g.title)}</a></h2><p>${escape(g.description)}</p><a href="/guides/${g.slug}/" aria-label="${escape(g.title)} 읽기">가이드 읽기 ↗</a></article>`).join('');
save('/guides/',layout('이용 가이드','임시메일을 선택하고 사용하는 방법부터 미수신 문제 해결과 개발 테스트까지 안내합니다.',`<main id="main" class="container page-main">${heading('필요할 때 찾아보는 메일 가이드','주소를 만들기 전부터 메일을 확인한 뒤까지. 짧은 수신함을 제대로 사용하는 방법을 알아보세요.')}<div class="article-grid">${cards}</div></main>`,'/guides/'));
for(const guide of guides) {
 const route='/guides/'+guide.slug+'/';
 const sections=guide.sections.map(s=>`<section><h2>${escape(s.heading)}</h2>${s.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}${s.bullets?`<ul>${s.bullets.map(p=>`<li>${escape(p)}</li>`).join('')}</ul>`:''}</section>`).join('');
 const sources=`<div class="sources"><h2>참고 자료</h2><ul>${guide.sources.map(s=>`<li><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a></li>`).join('')}</ul></div>`;
 const ad=canShowAds(route,config.ads)?`<aside class="article-ad" aria-label="광고"><span>광고</span><ins class="adsbygoogle" style="display:block" data-ad-client="ca-${config.ads.publisherId}" data-ad-slot="${config.ads.slotId}" data-ad-format="auto" data-full-width-responsive="true"></ins></aside>`:'';
 const body=`<main id="main" class="container page-main"><div class="breadcrumb"><a href="/guides/">이용 가이드</a> / ${escape(guide.category)}</div>${heading(guide.title,guide.description)}<article class="article-body"><p class="article-meta">XT Mail 편집 · 2026년 9월 6일</p>${sections}${sources}${ad}</article><p class="article-back"><a href="/guides/">← 전체 가이드</a> · <a href="/">무료 임시메일 사용하기</a></p></main>`;
 const schema=JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:guide.title,description:guide.description,datePublished:'2026-09-06',dateModified:'2026-09-06',author:{'@type':'Organization',name:'XT Mail',url:config.origin+'/about/'},mainEntityOfPage:config.origin+route}).replaceAll('<','\\u003c');
 save(route,layout(guide.title,guide.description,body,route,'guide','<script type="application/ld+json">'+schema+'</script>'));
}
const faqBody=`<main id="main" class="container page-main">${heading('자주 묻는 질문','주소 생성, 메일함 이용기간, 수신 문제에 대한 답변입니다.')}<div class="faq-list">${faq.map(item=>`<details><summary>${escape(item.question)}</summary><p>${escape(item.answer)}</p></details>`).join('')}</div><p class="article-back">해결되지 않았다면 <a href="/contact/">문의 방법</a>을 확인해 주세요.</p></main>`;
save('/faq/',layout('자주 묻는 질문','무료 여부, 24시간 이용기간, 수신 문제와 메일 보관에 대한 답변입니다.',faqBody,'/faq/'));
for(const page of pages)save(page.path,layout(page.title,page.description,documentPage(page),page.path));
fs.writeFileSync(path.join(dist,'404.html'),layout('페이지를 찾을 수 없습니다','요청한 페이지를 찾을 수 없습니다. 임시메일이나 이용 가이드로 이동할 수 있습니다.',`<main id="main" class="container page-main"><div class="article-body"><span class="eyebrow ink">404</span><h1>이 페이지는 찾을 수 없어요.</h1><p>주소가 바뀌었거나 잘못 입력되었을 수 있습니다.</p><p><a class="button button-dark" href="/">임시메일로 돌아가기</a></p><p><a href="/guides/">이용 가이드 보기</a></p></div></main>`,'/404.html','error'));
fs.writeFileSync(path.join(dist,'robots.txt'),'User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: '+config.origin+'/sitemap.xml\n');
fs.writeFileSync(path.join(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+routes.map(route=>'<url><loc>'+escape(config.origin+route)+'</loc></url>').join('')+'</urlset>\n');
fs.writeFileSync(path.join(dist,'ads.txt'),config.ads.publisherId?'google.com, '+config.ads.publisherId+', DIRECT, f08c47fec0942fa0\n':'# No advertising sellers are authorized in this build.\n');
const blockers=[];
if(!config.supportEmail)blockers.push('Public support/privacy contact email is not configured.');
if(!config.ads.publisherId)blockers.push('AdSense publisher ID / ownership verification is not configured.');
if(!config.ads.approved)blockers.push('AdSense site review has not been confirmed.');
if(!config.ads.consentReady)blockers.push('Certified CMP / privacy messages have not been configured and verified.');
fs.writeFileSync(path.join(root,'.build-report.json'),JSON.stringify({pages:routes.length,adsEnabled:guides.some(g=>canShowAds('/guides/'+g.slug+'/',config.ads)),blockers},null,2));
console.log('Built '+routes.length+' public pages, 404, sitemap, robots.txt and ads.txt. Ads: '+(config.ads.approved?'configured':'disabled')+'.');
for(const blocker of blockers)console.log('Pending: '+blocker);
