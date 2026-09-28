const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const PORT=process.env.PORT||3000;
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'admin123';
const DATA=path.join(__dirname,'orders.json');
if(!fs.existsSync(DATA)) fs.writeFileSync(DATA,'[]');
let sessions=new Map();
function json(res,status,obj){res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(obj));}
function body(req){return new Promise((resolve,reject)=>{let b='';req.on('data',c=>{b+=c;if(b.length>1e6)req.destroy()});req.on('end',()=>{try{resolve(b?JSON.parse(b):{})}catch(e){reject(e)}})})}
function orders(){try{return JSON.parse(fs.readFileSync(DATA,'utf8'))}catch{return []}}
function save(a){fs.writeFileSync(DATA,JSON.stringify(a,null,2))}
function auth(req){const h=req.headers.authorization||'';const t=h.startsWith('Bearer ')?h.slice(7):'';return sessions.has(t)}
const html=fs.readFileSync(path.join(__dirname,'index.html'));
const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS'});return res.end()}
  try{
    if(req.url==='/api/admin/login'&&req.method==='POST'){const b=await body(req);if(b.password!==ADMIN_PASSWORD)return json(res,401,{error:'Incorrect password.'});const token=crypto.randomBytes(32).toString('hex');sessions.set(token,Date.now()+8*60*60*1000);return json(res,200,{token})}
    if(req.url==='/api/orders'&&req.method==='POST'){const b=await body(req);if(!b.customer?.name||!b.customer?.phone||!b.customer?.address||!Array.isArray(b.items)||!b.items.length)return json(res,400,{error:'Missing order details.'});const a=orders();const o={id:Date.now(),createdAt:new Date().toISOString(),status:'new',...b};a.unshift(o);save(a);return json(res,201,{order:o})}
    if(req.url==='/api/orders'&&req.method==='GET'){if(!auth(req))return json(res,401,{error:'Admin login required.'});return json(res,200,{orders:orders()})}
    const m=req.url.match(/^\/api\/orders\/(\d+)$/);if(m&&req.method==='PATCH'){if(!auth(req))return json(res,401,{error:'Admin login required.'});const b=await body(req),a=orders(),o=a.find(x=>x.id===Number(m[1]));if(!o)return json(res,404,{error:'Order not found.'});if(!['new','confirmed','shipped','delivered','cancelled'].includes(b.status))return json(res,400,{error:'Invalid status.'});o.status=b.status;save(a);return json(res,200,{order:o})}
    if(req.url==='/api/health')return json(res,200,{ok:true});
    if(req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(html)}
    json(res,404,{error:'Not found'})
  }catch(e){json(res,500,{error:'Server error'})}
});
server.listen(PORT,()=>console.log(`The Leather House server running on http://localhost:${PORT}`));
