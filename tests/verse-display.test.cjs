const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
test('Psalm 46 display omits only trailing Selah without changing catalogue or other verses',()=>{
 const c=vm.createContext({window:{}});
 for(const f of ['topics','verses'])vm.runInContext(fs.readFileSync(path.join(root,'dist/data/'+f+'.js'),'utf8'),c);
 const source=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');
 vm.runInContext(source.match(/function displayVerseText\(verse\)\{[\s\S]*?\n\}/)[0],c);
 const before=JSON.stringify(c.window.Malsseum.data.verses);
 for(const verse of c.window.Malsseum.data.verses){
  const display=c.displayVerseText(verse);
  if(verse.id==='psalm-46-1-3'){
   assert.ok(verse.text.endsWith('(셀라)'));
   assert.equal(display,verse.text.slice(0,-5));
   assert.ok(display.endsWith('우리는 두려워하지 아니하리로다'));
   assert.equal(verse.reference,'시편 46:1–3');
  }else assert.equal(display,verse.text,verse.id);
 }
 assert.equal(JSON.stringify(c.window.Malsseum.data.verses),before);
 assert.equal(c.displayVerseText({id:'other',text:'본문 (셀라)'}),'본문 (셀라)');
 assert.equal(c.displayVerseText({id:'psalm-46-1-3',text:'앞 (셀라) 뒤 (셀라)'}),'앞 (셀라) 뒤');
});
