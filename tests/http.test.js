const test = require('node:test');
const assert = require('node:assert/strict');
process.env.RESEND_API_KEY='test-provider';
process.env.MAILBOX_SECRET='http-test-secret'.repeat(4);
const {createServer}=require('../server');
test('HTTP route protection, cookies, creation, receiving, closing and static files',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const realFetch=global.fetch;let ownAddress='';
 global.fetch=async(url,options)=>{
  if(String(url).startsWith('https://api.resend.com/'))return {ok:true,status:200,text:async()=>JSON.stringify({has_more:false,data:[{id:'message-own',to:[ownAddress],created_at:new Date().toISOString(),subject:'A real-shaped test message'},{id:'message-other',to:['other@example.org'],created_at:new Date().toISOString(),subject:'Private other mailbox'}]})};
  return realFetch(url,options);
 };
 try {
  for(const route of ['/','/guides/','/faq/','/privacy/','/terms/','/contact/','/robots.txt','/sitemap.xml','/ads.txt'])assert.equal((await realFetch(base+route)).status,200,route);
  for(const route of ['/.env','/site.config.json','/server.js','/data/messages.json','/not-real','/api/_lib/resend.js'])assert.equal((await realFetch(base+route)).status,404,route);
  assert.equal((await realFetch(base+'/api/messages?address=victim@example.org')).status,401);
  assert.equal((await realFetch(base+'/api/aliases')).status,410);
  const cross=await realFetch(base+'/api/mailbox',{method:'POST',headers:{Origin:'https://attacker.example'}});assert.equal(cross.status,403);
  const created=await realFetch(base+'/api/mailbox',{method:'POST',headers:{Origin:base}});assert.equal(created.status,201);
  const cookie=created.headers.get('set-cookie').split(';')[0];const mailbox=(await created.json()).mailbox;ownAddress=mailbox.address;
  assert.match(created.headers.get('set-cookie'),/HttpOnly/);assert.equal(created.headers.get('Cache-Control'),'no-store');
  const restored=await realFetch(base+'/api/mailbox',{headers:{Cookie:cookie}});assert.equal((await restored.json()).mailbox.address,ownAddress);
  const list=await realFetch(base+'/api/messages?address=other@example.org',{headers:{Cookie:cookie}});const data=await list.json();
  assert.equal(list.status,200);assert.deepEqual(data.messages.map(m=>m.id),['message-own']);assert.doesNotMatch(JSON.stringify(data),/Private other mailbox/);
  const closed=await realFetch(base+'/api/mailbox',{method:'DELETE',headers:{Cookie:cookie,Origin:base}});assert.match(closed.headers.get('set-cookie'),/Max-Age=0/);
  assert.equal((await realFetch(base+'/api/messages')).status,401);
  const root=await realFetch(base+'/');assert.match(root.headers.get('content-security-policy'),/frame-src 'none'/);
 }finally{global.fetch=realFetch;await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
});
