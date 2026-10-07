import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "docs");
mkdirSync(output, { recursive: true });
import {
  lessons,
  vocabulary,
  diagnosticItems,
  publicLesson,
  publicDiagnostic,
} from "../server/content.js";
import { estimate, nextItem } from "../server/adaptive.js";
const dir = resolve(root, "dist/assets");
const css = readFileSync(
  dir + "/" + readdirSync(dir).find((f) => f.endsWith(".css")),
  "utf8",
);
const bundle = readFileSync(
  dir + "/" + readdirSync(dir).find((f) => f.endsWith(".js")),
  "utf8",
);
const demo = `
const lessons=${JSON.stringify(lessons)};
const vocabulary=${JSON.stringify(vocabulary)};
const diagnosticItems=${JSON.stringify(diagnosticItems)};
const publicLesson=${publicLesson.toString()};
const publicDiagnostic=${publicDiagnostic.toString()};
const estimate=${estimate.toString()};
const nextItem=${nextItem.toString()};
const user={id:'preview-user',name:'Minh Anh',email:'preview@example.com',profile:{testType:'Academic',target:6.5,examDate:'2027-01-15',dailyMinutes:45,shareProgress:false}};
const initialStats=[{skill:'Listening',band:5.5,accuracy:72,count:4},{skill:'Reading',band:6,accuracy:80,count:5},{skill:'Writing',band:5.5,accuracy:null,count:3},{skill:'Speaking',band:5,accuracy:null,count:2}];
const state={signedIn:true,drafts:{},attempts:[],reviews:{},placement:null};
function dashboard(){
 const errors={NOT_GIVEN_as_FALSE:3,paraphrase:2,under_word_limit:1};
 state.attempts.forEach(a=>(a.result.error_tags||[]).forEach(t=>errors[t]=(errors[t]||0)+1));
 const stats=initialStats.map(s=>{const own=state.attempts.filter(a=>a.skill===s.skill);const n=own.reduce((n,a)=>n+(a.result.total||0),0),c=own.reduce((n,a)=>n+(a.result.correct||0),0);return {...s,count:s.count+own.length,accuracy:n?Math.round(c/n*100):s.accuracy};});
 return {skillStats:stats,weeklyMinutes:180+state.attempts.reduce((n,a)=>n+a.minutes,0),weeklyActivity:[10,30,45,20,35,15,25].map((minutes,i)=>({date:new Date(Date.now()-(6-i)*86400000).toISOString().slice(0,10),minutes})),attempts:state.attempts,topErrors:Object.entries(errors).sort((a,b)=>b[1]-a[1]).slice(0,3),plan:['r1','l1','w1'].map(id=>({...publicLesson(lessons.find(l=>l.id===id)),completed:state.attempts.some(a=>a.lesson_id===id)})),baseline:[],vocabulary:{reviewed:8+Object.keys(state.reviews).length,due:vocabulary.filter(w=>!state.reviews[w.id]||state.reviews[w.id].due<=new Date().toISOString()).length,retained:5},peers:user.profile.shareProgress?[{name:'Người đồng hành (minh họa)',weeklyMinutes:150}]:[]};
}
function placement(){const p=state.placement;return{id:p.id,answered:p.responses.length,total:36,finished:p.responses.length===36,item:p.responses.length===36?null:publicDiagnostic(nextItem(p.responses)),results:p.responses.length===36?['Reading','Listening'].map(skill=>({skill,...estimate(p.responses,skill)})):null};}
window.fetch=async(input,options={})=>{
 const raw=typeof input==='string'?input:input.url;
 const path=new URL(raw,location.href).pathname.replace('/api','');
 const method=options.method||'GET';let body={};try{body=JSON.parse(options.body||'{}');}catch{}
 let data,status=200;
 if(path==='/health')data={ok:true,aiConfigured:false,registrationCodeRequired:false,promptVersion:'pdf-v1.0'};
 else if(path==='/auth/login'||path==='/auth/register'){state.signedIn=true;if(body.name)user.name=body.name;user.email=body.email||user.email;data=user;}
 else if(!state.signedIn){status=401;data={error:'Vui lòng đăng nhập tài khoản minh họa.'};}
 else if(path==='/me')data=user;
 else if(path==='/auth/logout'){state.signedIn=false;data={ok:true};}
 else if(path==='/profile'){Object.assign(user.profile,body);data=user;}
 else if(path==='/dashboard')data=dashboard();
 else if(path==='/lessons')data=lessons.filter(l=>l.skill!=='Writing'||(user.profile.testType==='Academic'?l.mode!=='General Training':l.id!=='w2')).map(publicLesson);
 else if(path==='/vocabulary')data=vocabulary.map(w=>({...w,review:state.reviews[w.id]||null}));
 else if(path.startsWith('/vocabulary/')&&path.endsWith('/review')){const id=path.split('/')[2],prev=state.reviews[id],interval=body.remembered?Math.min(60,prev?Math.max(1,prev.interval*2):1):0;data=state.reviews[id]={interval,due:new Date(Date.now()+(body.remembered?interval*86400000:600000)).toISOString()};}
 else if(path.startsWith('/drafts/')){const id=path.split('/')[2];if(method==='PUT'){state.drafts[id]=body.body;data={ok:true};}else data={body:state.drafts[id]||''};}
 else if(path==='/attempts'){
  const l=lessons.find(l=>l.id===body.lessonId);let result;
  if(l.questions){const details=l.questions.map(q=>({id:q.id,text:q.text,answer:q.answer,response:body.answers?.[q.id],correct:body.answers?.[q.id]===q.answer,evidence:q.evidence,tag:q.tag}));result={source:'answer-key',correct:details.filter(q=>q.correct).length,total:details.length,details,error_tags:[...new Set(details.filter(q=>!q.correct).map(q=>q.tag))],repeated:state.attempts.some(a=>a.lesson_id===l.id),estimated_band:null,disclaimer:'Kết quả thao tác trong preview; không gửi dữ liệu lên server.'};}
  else {const wc=(body.text||'').trim().split(/\s+/).length;result={source:'checklist',estimated_band:null,confidence:0,criteria:[],strengths:[],improvements:['Kiểm tra lập trường hoặc overview rõ ràng.','Mỗi ý chính cần lý do và ví dụ.','Rà soát collocation, liên kết đoạn và cấu trúc câu.'],error_tags:wc<(l.minimumWords||0)?['under_word_limit']:[],rewrite_hint:'Chọn một ý chưa rõ và tự viết lại với ví dụ cụ thể.',disclaimer:'Checklist trong bản preview. AI thật cần cấu hình API key trên server.'};}
  const a={id:crypto.randomUUID(),lesson_id:l.id,skill:l.skill,response:body,result,minutes:body.minutes,created:new Date().toISOString()};state.attempts.unshift(a);data={id:a.id,...result};status=201;
 }
 else if(path==='/placement'){state.placement||={id:'preview-diagnostic',responses:[]};data=placement();}
 else if(path.startsWith('/placement/')&&path.endsWith('/answer')){const q=nextItem(state.placement.responses);state.placement.responses.push({id:q.id,skill:q.skill,difficulty:q.difficulty,correct:body.answer===q.answer});data=placement();}
 else if(path==='/recordings'&&method==='GET')data=[];
 else if(path==='/ai/generated')data=[];
 else {status=503;data={error:'Tính năng này cần server thật. Bản preview HTML không kết nối backend hoặc AI.'};}
 return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
};
document.addEventListener('click',e=>{const a=e.target.closest('a[href="/api/export"]');if(!a)return;e.preventDefault();const url=URL.createObjectURL(new Blob([JSON.stringify({demo:true,user,dashboard:dashboard(),drafts:state.drafts},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='ielts-duo-preview-data.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
`;
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IELTS Duo · Preview</title><style>${css}</style><style>.preview-banner{position:fixed;z-index:100;top:0;left:0;right:0;height:32px;background:#dfe9cc;color:#385b38;display:flex;justify-content:center;align-items:center;text-align:center;font:10px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.3px;padding:0 12px;box-shadow:0 1px 0 #bdccac}body{padding-top:32px}.sidebar{top:32px}.modal-overlay{top:32px}.auth{min-height:calc(100vh - 32px)}@media(max-width:600px){.preview-banner{font-size:8px}}</style></head><body><div class="preview-banner">BẢN XEM THỬ · Dữ liệu minh họa · Không kết nối server/AI · Thao tác thử được đặt lại khi tải lại trang</div><div id="root"></div><script>${demo.replace(/<\/script/gi, "<\\/script")}</script><script type="module">${bundle.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
writeFileSync(resolve(output, "index.html"), html);
writeFileSync(resolve(output, ".nojekyll"), "");
console.log(
  "Standalone React preview generated:",
  Math.round(Buffer.byteLength(html) / 1024),
  "KB",
);
