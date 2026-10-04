// Local-only review routes. Production dist files and storage are never rewritten.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const ids = ["psalm-143-8","psalm-139-14","matthew-11-28","romans-8-28","joshua-1-9","psalm-23-2","psalm-130-5","psalm-118-24","mark-6-31","john-14-27","luke-18-1","1-john-1-9","psalm-19-14","philippians-1-6","1-samuel-16-7","genesis-50-20","proverbs-4-23","ecclesiastes-3-11","isaiah-40-11","habakkuk-1-2","psalm-103-2","psalm-131-2","psalm-51-10","proverbs-15-1","ecclesiastes-4-10","matthew-6-34","luke-12-22","mark-9-24","romans-12-15","ephesians-2-10","hebrews-4-16","james-1-5","isaiah-49-15","lamentations-3-22","exodus-14-14","psalm-56-3","psalm-121-1-2","psalm-127-2","proverbs-3-5","proverbs-16-9","isaiah-55-9","jeremiah-29-11","zephaniah-3-17","matthew-5-4","matthew-10-30-31","romans-8-26","romans-12-18","ephesians-4-32","james-1-17","revelation-21-4","psalm-139-8","isaiah-40-31","galatians-6-9","philippians-4-6","james-1-19","psalm-4-8","isaiah-41-10","2-corinthians-5-17","1-peter-5-7","romans-8-38-39","psalm-56-8","isaiah-1-18","2-corinthians-12-9","hebrews-13-5","1-thessalonians-5-16-18","psalm-13-1-2","jeremiah-33-3","ephesians-4-26-27","romans-8-1","philippians-4-4","psalm-32-8","psalm-73-26","isaiah-43-2","galatians-1-10","2-corinthians-10-12","psalm-40-1-2","psalm-147-3","isaiah-30-15","colossians-3-13","romans-12-19","psalm-37-7","psalm-42-5","micah-7-8","2-corinthians-4-8-9","romans-12-12","psalm-9-9-10","psalm-73-21-23","psalm-30-5","psalm-37-5-6","romans-8-37","psalm-27-10","psalm-62-5-6","psalm-10-1","psalm-34-18","psalm-138-8","psalm-55-22","hebrews-13-5-6","psalm-37-23-24","psalm-46-1-3","psalm-94-19","psalm-55-12-14"];
const labels = ["시편 143:8","시편 139:14","마태복음 11:28","로마서 8:28","여호수아 1:9","시편 23:2","시편 130:5","시편 118:24","마가복음 6:31","요한복음 14:27","누가복음 18:1","요한일서 1:9","시편 19:14","빌립보서 1:6","사무엘상 16:7","창세기 50:20","잠언 4:23","전도서 3:11","이사야 40:11","하박국 1:2","시편 103:2","시편 131:2","시편 51:10","잠언 15:1","전도서 4:10","마태복음 6:34","누가복음 12:22","마가복음 9:24","로마서 12:15","에베소서 2:10","히브리서 4:16","야고보서 1:5","이사야 49:15","예레미야애가 3:22","출애굽기 14:14","시편 56:3","시편 121:1-2","시편 127:2","잠언 3:5","잠언 16:9","이사야 55:9","예레미야 29:11","스바냐 3:17","마태복음 5:4","마태복음 10:30-31","로마서 8:26","로마서 12:18","에베소서 4:32","야고보서 1:17","요한계시록 21:4","시편 139:8","이사야 40:31","갈라디아서 6:9","빌립보서 4:6","야고보서 1:19","시편 4:8","이사야 41:10","고린도후서 5:17","베드로전서 5:7","로마서 8:38-39","시편 56:8","이사야 1:18","고린도후서 12:9","히브리서 13:5","데살로니가전서 5:16-18","시편 13:1-2","예레미야 33:3","에베소서 4:26-27","로마서 8:1","빌립보서 4:4","시편 32:8","시편 73:26","이사야 43:2","갈라디아서 1:10","고린도후서 10:12","시편 40:1-2","시편 147:3","이사야 30:15","골로새서 3:13","로마서 12:19","시편 37:7","시편 42:5","미가 7:8","고린도후서 4:8-9","로마서 12:12","시편 9:9-10","시편 73:21-23","시편 30:5","시편 37:5-6","로마서 8:37","시편 27:10","시편 62:5-6","시편 10:1","시편 34:18","시편 138:8","시편 55:22","히브리서 13:5-6","시편 37:23-24","시편 46:1–3","시편 94:19","시편 55:12–14"];
function replaceOnce(source, from, to) {
  if (source.split(from).length !== 2) throw new Error('Preview adapter no longer matches app.js');
  return source.replace(from, to);
}
function previewApp(source) {
  source = replaceOnce(source,
    'const PersonalReflections=(()=>{',
    `DailyVerse.get=()=>readableVerses().find(v=>v.id===${JSON.stringify(ids)}.find(id=>id===new URLSearchParams(location.search).get('verse')));
const PersonalReflections=(()=>{`);
  return "window.MalsseumAIEndpoint='';\n" + source;
}
const boot = `(() => {
 const values=new Map([['malsseum-annae.display-name.v1','검수']]);
 Object.defineProperty(window,'localStorage',{value:{getItem:k=>values.get(String(k))??null,setItem:(k,v)=>values.set(String(k),String(v)),removeItem:k=>values.delete(String(k)),clear:()=>values.clear(),key:i=>[...values.keys()][i]??null,get length(){return values.size}}});
})();`;
function previewHtml(source) {
  source = source.replace('</head>', '<script defer src="/__daily-review.js"></script><style>#meditation-detail .meditation-journal.is-daily-checklist{margin-top:calc(var(--meditation-section-gap) / 2 + 8px);padding-top:calc(var(--meditation-section-gap) / 2 - 1px + 8px)}</style></head>');
  source = replaceOnce(source, '<script defer src="app.js"></script>', '<script src="/__daily-memory.js"></script><script defer src="/__daily-preview-app.js"></script>');
  return source;
}
const review = `(() => {
 const panel=document.createElement('aside');panel.style.cssText='max-width:500px;margin:auto;padding:10px 16px;background:#edf3e8;color:#315f49;font:14px sans-serif;box-sizing:border-box';
 const label=document.createElement('label');label.textContent='Daily 샘플 검수: ';
 const select=document.createElement('select');select.style.cssText='max-width:100%;font:inherit;padding:6px';
 const ids=${JSON.stringify(ids)},labels=${JSON.stringify(labels)};
 ids.forEach((id,i)=>{const option=document.createElement('option');option.value=id;option.textContent=(i+1)+'. '+labels[i];select.append(option)});
 select.value=new URLSearchParams(location.search).get('verse');select.onchange=()=>location.href='/daily-preview?verse='+select.value;
 label.append(select);const note=document.createElement('p');note.textContent='미리보기 저장은 이 페이지에서만 유지돼요. 새로고침하거나 샘플을 바꾸면 사라지며 실제 기록에는 저장되지 않아요.';note.style.margin='6px 0 0';
 panel.append(label,note);document.body.prepend(panel);displayScreen('reflection');
 if(ids.slice(0,55).includes(select.value))openDailyMeditation(DailyVerse.get());
})();`;
function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const send = (type, body, status=200) => {res.writeHead(status, {'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(body);};
    try {
      if(url.pathname==='/daily-preview') {
        if(!url.searchParams.has('verse')) {res.writeHead(302,{Location:'/daily-preview?verse='+ids[0]});return res.end();}
        if(!ids.includes(url.searchParams.get('verse')))return send('text/plain','검수 대상 101개 말씀만 열 수 있어요.',404);
        return send('text/html',previewHtml(fs.readFileSync(path.join(root,'index.html'),'utf8')));
      }
      if(url.pathname==='/__daily-memory.js')return send('text/javascript',boot);
      if(url.pathname==='/__daily-review.js')return send('text/javascript',review);
      if(url.pathname==='/__daily-preview-app.js')return send('text/javascript',previewApp(fs.readFileSync(path.join(root,'app.js'),'utf8')));
      const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
      if(!file.startsWith(root+path.sep))return send('text/plain','Forbidden',403);
      const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg'};
      return send(types[path.extname(file)]||'application/octet-stream',fs.readFileSync(file));
    } catch(error) {return send('text/plain',error.code==='ENOENT'?'Not found':'Preview unavailable',error.code==='ENOENT'?404:500);}
  });
}
module.exports={createServer,previewApp,previewHtml,ids,boot};
if(require.main===module)createServer().listen(4175,'0.0.0.0',()=>console.log('LAN: http://0.0.0.0:4175/daily-preview'));
