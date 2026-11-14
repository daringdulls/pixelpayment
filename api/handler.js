// The Vercel function relays only the signed-in caller's JWT to the isolated database API.
export default async function handler(req,res){
 const url=new URL(req.url,'https://localhost'),path=url.searchParams.has('route')?'/api/'+url.searchParams.get('route'):url.pathname;
 res.setHeader('Cache-Control','no-store');
 const endpoint=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!endpoint||!key)return res.status(503).json({error:'Database configuration is pending. Please contact the administrator.'});
 if(path==='/api/config')return res.status(200).json({url:endpoint,key});
 if(!/^Bearer [A-Za-z0-9._-]+$/.test(req.headers.authorization||''))return res.status(401).json({error:'Sign in to your staff account.'});
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});
 const origin=req.headers.origin,host=req.headers.host;
 if(req.method==='POST'&&(!origin||new URL(origin).host!==host))return res.status(403).json({error:'Invalid request origin.'});
 const target=new URL(endpoint+'/functions/v1/cozy-guest-ledger');target.searchParams.set('path',path);
 try{const upstream=await fetch(target,{method:req.method,headers:{Authorization:req.headers.authorization,apikey:key,'Content-Type':'application/json'},...(req.method==='POST'?{body:JSON.stringify(req.body)}:{})});
 res.status(upstream.status).setHeader('Content-Type','application/json');res.send(await upstream.text());
 }catch{res.status(503).json({error:'The shared database is temporarily unavailable. Please try again shortly.'});}
}
