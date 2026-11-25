import {staff} from './_staff.js';
import {rates} from './_rates.js';
import {branding} from './_branding.js';
import {bills} from './_bills.js';
import {guests} from './_guests.js';
import {CASHIER_BLOCKED,cashierEmails,jwtEmail} from './_roles.js';
// The Vercel function relays only the signed-in caller's JWT to the isolated database API.
export default async function handler(req,res){
 const url=new URL(req.url,'https://localhost'),path=url.searchParams.has('route')?'/api/'+url.searchParams.get('route'):url.pathname;
 res.setHeader('Cache-Control','no-store');
 const endpoint=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY,domain=process.env.STAFF_USERNAME_DOMAIN||'pixelpayment.local';
 if(!endpoint||!key)return res.status(503).json({error:'Database configuration is pending. Please contact the administrator.'});
 if(path==='/api/config')return res.status(200).json({url:endpoint,key,usernameDomain:domain});
 if(!/^Bearer [A-Za-z0-9._-]+$/.test(req.headers.authorization||''))return res.status(401).json({error:'Sign in to your staff account.'});
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});
 const origin=req.headers.origin,host=req.headers.host;
 if(req.method==='POST'&&(!origin||new URL(origin).host!==host))return res.status(403).json({error:'Invalid request origin.'});
 // Front-office cashiers are "admin" in the ledger but may not use head-office-only actions.
 if(CASHIER_BLOCKED.has(path)){let set;try{set=await cashierEmails(endpoint);}catch{return res.status(503).json({error:'Unable to verify your access. Please try again shortly.'});}
  if(set.has(jwtEmail(req.headers.authorization)))return res.status(403).json({error:'Cashiers can’t do this. Ask head office.'});}
 if(path==='/api/stays'&&req.method==='POST')return guests(req,res,{endpoint,key});
 if(path==='/api/staff-create'||path==='/api/staff-reset'||path==='/api/staff-rename')return staff(req,res,path,{endpoint,key,domain});
 if(path==='/api/rates'||path==='/api/rates-save')return rates(req,res,path,{endpoint,key});
 if(path==='/api/branding'||path==='/api/branding-save')return branding(req,res,path,{endpoint,key});
 if(['/api/bill-update','/api/bill-delete','/api/payment-update','/api/payment-void','/api/stay-reopen','/api/stay-delete'].includes(path))return bills(req,res,path,{endpoint,key});
 const target=new URL(endpoint+'/functions/v1/cozy-guest-ledger');target.searchParams.set('path',path);
 try{const upstream=await fetch(target,{method:req.method,headers:{Authorization:req.headers.authorization,apikey:key,'Content-Type':'application/json'},...(req.method==='POST'?{body:JSON.stringify(req.body)}:{})});
 let text=await upstream.text();
 if(path==='/api/data'&&upstream.ok){try{const ws=JSON.parse(text),set=await cashierEmails(endpoint);
  if(ws.member&&set.has(String(ws.email||'').toLowerCase())){ws.member.app_role='cashier';delete ws.members;}
  else if(Array.isArray(ws.members))ws.members.forEach((m)=>{if(set.has(String(m.email||'').toLowerCase()))m.app_role='cashier';});
  text=JSON.stringify(ws);}catch{}}
 res.status(upstream.status).setHeader('Content-Type','application/json');res.send(text);
 }catch{res.status(503).json({error:'The shared database is temporarily unavailable. Please try again shortly.'});}
}
