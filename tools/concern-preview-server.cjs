// Local-only review adapter: real result renderer, memory-only storage, no AI requests.
const fs=require('node:fs');
const path=require('node:path');
const {createServer:createBase}=require('./daily-preview-server.cjs');
const approved=require('../tests/fixtures/new-concern-approved.json');
const drafts=require('./concern-guidance-drafts.json');
const ids=approved.map(v=>v.id);
const root=path.join(__dirname,'../dist');
const catalogueContext=require('node:vm').createContext({window:{}});
for(const file of ['topics','verses'])require('node:vm').runInContext(fs.readFileSync(path.join(root,'data',file+'.js'),'utf8'),catalogueContext);
const existingIds=Array.from(catalogueContext.window.Malsseum.data.verses.slice(0,5),v=>v.id);
const reviewIds=[...existingIds,...ids];
const boot=`(()=>{
 const values=new Map([['malsseum-annae.display-name.v1','검수'],['malsseum-annae.text-size.v1',new URLSearchParams(location.search).get('size')||'default']]);
 Object.defineProperty(window,'localStorage',{value:{getItem:k=>values.get(String(k))??null,setItem:(k,v)=>values.set(String(k),String(v)),removeItem:k=>values.delete(String(k)),clear:()=>values.clear(),key:i=>[...values.keys()][i]??null,get length(){return values.size}}});
 window.MalsseumAIEndpoint='';
})();`;
const review=`(()=>{
 const ids=${JSON.stringify(reviewIds)},existingIds=${JSON.stringify(existingIds)},drafts=${JSON.stringify(drafts)};
 const params=new URLSearchParams(location.search),id=params.get('verse'),data=window.Malsseum.data;
 const original=data.verses.find(v=>v.id===id);
 const verse={...original,...data.reflections[id],...drafts[id]};
 const analysis=classifyConcern(original.expressions[0]);
 const selection={status:'selected',verse,matched:true,continued:false,mixed:false,analysis};
 conversation.replaceChildren(renderTurn(original.expressions[0],selection));
 previousId=id;previousAnalysis=analysis;turnCount=1;refreshSaveButtons();displayScreen('result');
 const panel=document.createElement('aside');panel.id='concern-review-controls';panel.style.cssText='padding:12px 0;font-size:14px;line-height:1.6';
 const note=document.createElement('p');note.textContent=(drafts[id]?'검수용: 질문·기도문은 미승인 초안이야. ':'검수용: 질문·기도문은 사용자 승인본이야. ')+'저장은 메모리에만 남고 새로고침하면 사라져.';
 const select=document.createElement('select');select.setAttribute('aria-label','검수할 말씀');select.style.cssText='max-width:100%;font:inherit';
 ids.forEach(value=>{const o=document.createElement('option');o.value=value;const existing=existingIds.indexOf(value);o.textContent=(existing>=0?'기존 '+(existing+1):'신규 '+(${JSON.stringify(ids)}.indexOf(value)+1))+'. '+data.verses.find(v=>v.id===value).reference;select.append(o)});select.value=id;
 select.onchange=()=>{params.set('verse',select.value);location.search=params.toString()};
 const sizes=document.createElement('select');sizes.setAttribute('aria-label','검수 글씨 크기');sizes.style.cssText='max-width:100%;font:inherit';
 ['default','large','xlarge'].forEach((value,i)=>{const o=document.createElement('option');o.value=value;o.textContent=['기본','크게','더 크게'][i];sizes.append(o)});sizes.value=params.get('size')||'default';sizes.onchange=()=>{params.set('size',sizes.value);location.search=params.toString()};
 panel.append(note,select,sizes);document.querySelector('#result').prepend(panel);mainContent.scrollTop=0;
 const metadata=document.createElement('details');metadata.id='concern-review-metadata';metadata.style.cssText='padding:12px 0;overflow-wrap:anywhere;font-size:14px;line-height:1.6';
 const summary=document.createElement('summary');summary.textContent='현재 추천 설정·대표 고민 보기';metadata.append(summary);
 const add=(label,text)=>{const p=document.createElement('p');p.textContent=label+': '+text;metadata.append(p)};
 add('ID',id);add('범위',original.reference);
 add('주제',original.topics.map(id=>{const topic=data.topics.find(t=>t.id===id);return (topic?.label||topic?.name||id)+' ('+id+')'}).join(', '));
 add('상황',original.situations.join(', '));add('추천 설명',original.recommendationNote);
 add('본문 문맥',original.contextNote);add('대표 고민 예시',original.expressions.join(' / '));
 add('검수 안내','이 화면은 해당 말씀을 직접 표시해. 예시를 실제 입력했을 때 최종 선택은 다른 후보와 최근 이력에 따라 달라질 수 있어.');
 panel.append(metadata);
})();`;
function createServer(){
 const server=createBase(),fallback=server.listeners('request')[0];server.removeAllListeners('request');
 server.on('request',(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const send=(type,body,status=200)=>{res.writeHead(status,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(body)};
  if(url.pathname==='/concern-preview'){
   if(!url.searchParams.has('verse')){res.writeHead(302,{Location:'/concern-preview?verse='+ids[0]});return res.end()}
   if(!reviewIds.includes(url.searchParams.get('verse')))return send('text/plain','Unknown review verse',404);
   let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
   html=html.replace('<script defer src="ai-config.js"></script>','');
   html=html.replace('<head>','<head><script src="/__concern-memory.js"></script>');
   html=html.replace('</head>','<script defer src="/__concern-review.js"></script></head>');
   return send('text/html',html);
  }
  if(url.pathname==='/__concern-memory.js')return send('text/javascript',boot);
  if(url.pathname==='/__concern-review.js')return send('text/javascript',review);
  fallback(req,res);
 });return server;
}
module.exports={createServer,ids,existingIds,boot};
if(require.main===module)createServer().listen(4176,'0.0.0.0',()=>console.log('Concern preview listening on port 4176'));
