const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('Daily 51 onward is preserved and the 100 production candidates have matching guidance',()=>{
 const c=vm.createContext({window:{}});
 for(const f of ['topics','verses','daily-reflections'])vm.runInContext(read('dist/data/'+f+'.js'),c);
 const {verses,dailyReflections}=c.window.Malsseum.data;
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(Object.entries(dailyReflections).slice(50))).digest('hex'),'c9c82bccc65fa0ef441336f7146a0b65b9f8e5d54c8470ca2dff4973ca57047b');
 assert.equal(verses.length,110);assert.equal(Object.keys(dailyReflections).length,101);
 const known=new Set([...verses,...Object.values(c.window.Malsseum.data.dailyVerseOverrides)].map(v=>v.id));
 for(const [i,id] of Object.keys(dailyReflections).slice(0,100).entries()){assert(known.has(id));assert.equal(dailyReflections[id].questions.length,i<50?2:3);}
});
test('production loads Daily before app and meditation uses matching ID without concern fallback',()=>{
 const html=read('dist/index.html'),app=read('dist/app.js');
 assert.equal((html.match(/src="data\/daily-reflections.js"/g)||[]).length,1);
 assert.ok(html.indexOf('src="data/daily-reflections.js"')<html.indexOf('src="app.js"'));
 const meditation=app.slice(app.indexOf('function openDailyMeditation('),app.indexOf('function openReflectionList('));
 assert.match(meditation,/const daily=window.Malsseum.data.dailyReflections\[verse.id\]/);
 assert.match(meditation,/question:daily.questions.join\('\\n'\)/);
 assert.doesNotMatch(meditation,/data.reflections/);
 assert.match(app,/window.Malsseum.data.reflections\[selected.verse.id\]/);
 assert.match(app,/window.Malsseum.data.reflections\[id\]/);
});
test('Preview reuses production guidance rendering with one data script and memory isolation',()=>{
 const {previewHtml,previewApp}=require('../tools/daily-preview-server.cjs');
 const app=read('dist/app.js'),adapted=previewApp(app),html=previewHtml(read('dist/index.html'));
 const start='function openDailyMeditation(',end='function openReflectionList(';
 assert.equal(adapted.slice(adapted.indexOf(start),adapted.indexOf(end)),app.slice(app.indexOf(start),app.indexOf(end)));
 assert.equal((html.match(/src="data\/daily-reflections.js"/g)||[]).length,1);
 assert.match(html,/__daily-memory.js/);
});
