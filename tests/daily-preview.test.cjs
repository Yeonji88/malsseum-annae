const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createServer,previewApp,boot,ids}=require('../tools/daily-preview-server.cjs');
test('preview adapts only the daily guidance lookup and isolates storage',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../dist/app.js'),'utf8');
 const adapted=previewApp(source);
 new vm.Script(adapted);
 assert.ok(adapted.includes('const daily=window.Malsseum.data.dailyReflections[verse.id]'));
 assert.ok(!adapted.includes('const reflection=window.Malsseum.data.reflections[verse.id]'));
 assert.ok(adapted.includes('window.Malsseum.data.reflections[selected.verse.id]'));
 assert.ok(adapted.includes('window.Malsseum.data.reflections[id]'));
 const context=vm.createContext({window:{localStorage:{getItem:()=>{throw Error('real storage accessed');}}}});
 vm.runInContext(boot,context);
 context.window.localStorage.setItem('test','draft');
 assert.equal(context.window.localStorage.getItem('test'),'draft');
 assert.throws(()=>previewApp('changed app structure'),/no longer matches/);
});
test('preview route allows only samples and leaves normal app responses unchanged',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal((await fetch(base+'/daily-preview?verse=psalm-56-3')).status,404);
  const context=vm.createContext({window:{Malsseum:{data:{}}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/data/daily-reflections.js'),'utf8'),context);
  assert.deepEqual([...ids].sort(),Object.keys(context.window.Malsseum.data.dailyReflections).sort());
  assert.equal(ids.length,35);
  for(const id of ids)assert.equal((await fetch(base+'/daily-preview?verse='+id)).status,200,id);
  const review=await(await fetch(base+'/__daily-review.js')).text();
  for(const id of ids)assert.ok(review.includes(id),id+' selectable');
  const html=await(await fetch(base+'/daily-preview?verse=john-11-35')).text();
  assert.match(html,/__daily-memory.js/);assert.match(html,/data\/daily-reflections.js/);
  assert.equal(await(await fetch(base+'/app.js')).text(),fs.readFileSync(path.join(__dirname,'../dist/app.js'),'utf8'));
  assert.doesNotMatch(await(await fetch(base+'/')).text(),/__daily|daily-reflections/);
 }finally{await new Promise(r=>server.close(r));}
});
