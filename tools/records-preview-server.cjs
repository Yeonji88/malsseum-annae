// Local review only: sample records live in isolated memory, never real storage.
const fs=require('node:fs'),path=require('node:path');
const {createServer:baseServer,boot}=require('./daily-preview-server.cjs');
const review=`(()=>{
 const query=new URLSearchParams(location.search),count=Math.max(0,Math.min(120,Number(query.get('count')||21)));
 const verses=readableVerses().slice(0,count),times={},records=[];
 verses.forEach((verse,i)=>{const date=new Date(Date.UTC(2026,7,1,i)).toISOString();times[verse.id]=date;records.push({id:'preview-'+i,verseId:verse.id,content:'페이지 검수용 묵상 '+(i+1),createdAt:date,updatedAt:date});});
 localStorage.setItem(SavedVerses.key,JSON.stringify(verses.map(v=>v.id)));
 localStorage.setItem(SavedVerses.savedAtKey,JSON.stringify(times));
 localStorage.setItem(PersonalReflections.key,JSON.stringify(records));
 if(query.get('list')==='saved')displayScreen('profile');else openReflectionList();
})();`;
function createServer(){
 const server=baseServer(),serve=server.listeners('request')[0];server.removeAllListeners('request');
 server.on('request',(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const send=(type,text)=>{res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(text);};
  if(url.pathname==='/records-preview')return send('text/html',fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8').replace('<script defer src="app.js"></script>','<script src="/__records-memory.js"></script><script defer src="app.js"></script><script defer src="/__records-review.js"></script>'));
  if(url.pathname==='/__records-memory.js')return send('text/javascript',boot);
  if(url.pathname==='/__records-review.js')return send('text/javascript',review);
  serve(req,res);
 });return server;
}
module.exports={createServer};
if(require.main===module)createServer().listen(4178,'0.0.0.0',()=>console.log('Records Preview: http://localhost:4178/records-preview'));
