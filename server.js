const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
try { process.loadEnvFile(path.join(__dirname,'.env')); } catch(error) { if(error.code!=='ENOENT') throw error; }
const root = path.join(__dirname,'dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const handlers={'/api/config':require('./api/config'),'/api/mailbox':require('./api/mailbox'),'/api/messages':require('./api/messages'),'/api/aliases':require('./api/aliases'),'/api/health':require('./api/health')};
const inboxCsp="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
function createServer() {
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  try {
   const url = new URL(req.url,'http://localhost');let pathname;
   try {pathname=decodeURIComponent(url.pathname);} catch {res.writeHead(400);return res.end('Bad request');}
   if(pathname.startsWith('/api/')) {
    res.setHeader('X-Robots-Tag','noindex, nofollow, nosnippet');
    req.query=Object.fromEntries(url.searchParams);
    let handler=handlers[pathname.replace(/\/$/,'')];
    if(/^\/api\/messages\/[a-zA-Z0-9_-]+$/.test(pathname)){handler=require('./api/messages/[id]');req.query.id=pathname.split('/').pop();}
    if(!handler){res.writeHead(404);return res.end('Not found');}
    return await handler(req,res);
   }
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end();}
   const candidate=path.resolve(root,'.'+pathname);
   if(!candidate.startsWith(root+path.sep) && candidate!==root){res.writeHead(404);return res.end('Not found');}
   if(pathname.endsWith('/index.html') && fs.existsSync(candidate) && fs.statSync(candidate).isFile()){res.writeHead(308,{Location:pathname.slice(0,-10)+url.search});return res.end();}
   let file=candidate;
   if(fs.existsSync(file)&&fs.statSync(file).isDirectory()){
    if(!pathname.endsWith('/')){res.writeHead(308,{Location:pathname+'/'+url.search});return res.end();}
    file=path.join(file,'index.html');
   }
   if(pathname==='/' || pathname==='/index.html')res.setHeader('Content-Security-Policy',inboxCsp);
   const exists=fs.existsSync(file)&&fs.statSync(file).isFile();
   if(!exists)file=path.join(root,'404.html');
   res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
   res.setHeader('Cache-Control','no-cache');
   res.writeHead(exists?200:404);
   if(req.method==='HEAD')return res.end();
   fs.createReadStream(file).pipe(res);
  }catch{if(!res.headersSent)res.writeHead(500);res.end('Request failed');}
 });
}
if(require.main===module){
 if(!fs.existsSync(path.join(root,'index.html')))throw new Error('Run npm run build before starting.');
 const server=createServer();const port=Number(process.env.PORT||4173);
 server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log('Local: http://'+(process.env.HOST||'127.0.0.1')+':'+port));
}
module.exports={createServer};
