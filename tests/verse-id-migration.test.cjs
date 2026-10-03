const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const oldId='psalm-46-1-2',newId='psalm-46-1-3';
const prefix='malsseum-annae.';
const keys={saved:prefix+'saved-verse-ids.v1',times:prefix+'saved-verse-times.v1',records:prefix+'personal-reflections.v1',current:prefix+'daily-verse.v1',history:prefix+'daily-verse-history.v1'};
function setup(values={}){
 const map=new Map(Object.entries(values).map(([k,v])=>[k,JSON.stringify(v)]));let writes=0;
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>{writes++;map.set(k,v);}};
 const c=vm.createContext({window:{Malsseum:{services:{}}}});
 vm.runInContext(fs.readFileSync(path.join(root,'dist/services/migrateVerseIds.js'),'utf8'),c);
 return {map,storage,run:()=>c.window.Malsseum.services.migrateVerseIds(storage),read:k=>JSON.parse(map.get(k)),writes:()=>writes};
}
test('legacy saved verses, dates, journal contents and daily history survive ID migration and reruns',()=>{
 const record={id:'journal-1',verseId:oldId,content:'그대로 보존할 내 기록\n둘째 줄',createdAt:'2026-09-01T01:00:00Z',updatedAt:'2026-09-01T02:00:00Z'};
 const s=setup({[keys.saved]:['john-11-35',oldId],[keys.times]:{[oldId]:'2026-09-01T00:00:00Z'},[keys.records]:[record],[keys.current]:{date:'2026-09-27',verseId:oldId},[keys.history]:[{date:'2026-09-27',verseId:oldId}],unrelated:{verseId:oldId,text:'do not touch'}});
 const untouched=s.map.get('unrelated');s.run();
 assert.deepEqual(s.read(keys.saved),['john-11-35',newId]);assert.deepEqual(s.read(keys.times),{[newId]:'2026-09-01T00:00:00Z'});
 assert.deepEqual(s.read(keys.records),[{...record,verseId:newId}]);assert.deepEqual(s.read(keys.current),{date:'2026-09-27',verseId:newId});assert.deepEqual(s.read(keys.history),[{date:'2026-09-27',verseId:newId}]);assert.equal(s.map.get('unrelated'),untouched);
 const first=[...s.map],writes=s.writes();s.run();s.run();assert.deepEqual([...s.map],first);assert.equal(s.writes(),writes);
});
test('mixed old/new IDs merge bookmarks without losing distinct personal records or history dates',()=>{
 const records=[{id:'a',verseId:oldId,content:'a'},{id:'b',verseId:newId,content:'b'}];
 const s=setup({[keys.saved]:[oldId,newId,'john-11-35'],[keys.times]:{[oldId]:'2026-09-01T00:00:00Z',[newId]:'2026-09-02T00:00:00Z'},[keys.records]:records,[keys.history]:[{date:'2026-09-01',verseId:oldId},{date:'2026-09-01',verseId:newId},{date:'2026-09-02',verseId:oldId}]});s.run();
 assert.deepEqual(s.read(keys.saved),[newId,'john-11-35']);assert.equal(s.read(keys.times)[newId],'2026-09-01T00:00:00Z');assert.deepEqual(s.read(keys.records),records.map(x=>({...x,verseId:newId})));assert.equal(s.read(keys.history).length,2);s.run();assert.equal(s.read(keys.records).length,2);
});
test('malformed or absent data stays untouched; failed writes can safely retry',()=>{
 const s=setup({[keys.saved]:[oldId],[keys.current]:{verseId:oldId}});s.map.set(keys.records,'invalid JSON');const write=s.storage.setItem;s.storage.setItem=(k,v)=>{if(k===keys.saved)throw Error('quota');write(k,v);};s.run();assert.deepEqual(s.read(keys.saved),[oldId]);assert.equal(s.map.get(keys.records),'invalid JSON');s.storage.setItem=write;s.run();assert.deepEqual(s.read(keys.saved),[newId]);assert.equal(s.map.get(keys.records),'invalid JSON');const empty=setup();empty.run();assert.equal(empty.map.size,0);
});
test('migration runs before app consumers and inside Preview memory storage',()=>{
 const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8'),app=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');
 assert.ok(html.indexOf('services/migrateVerseIds.js')<html.indexOf('src="app.js"'));assert.ok(app.indexOf('migrateVerseIds(window.localStorage)')<app.indexOf('const SavedVerses='));
 const {boot}=require('../tools/daily-preview-server.cjs');const c=vm.createContext({window:{Malsseum:{services:{}},localStorage:{getItem(){throw Error('real storage touched');}}}});vm.runInContext(boot,c);vm.runInContext(fs.readFileSync(path.join(root,'dist/services/migrateVerseIds.js'),'utf8'),c);c.window.localStorage.setItem(keys.saved,JSON.stringify([oldId]));c.window.Malsseum.services.migrateVerseIds(c.window.localStorage);assert.deepEqual(JSON.parse(c.window.localStorage.getItem(keys.saved)),[newId]);
});
test('actual SavedVerses, DailyVerse and PersonalReflections consumers retain migrated links',()=>{
 const today=new Date();const date=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
 const record={id:'kept-record',verseId:oldId,content:'기록 내용 보존',createdAt:today.toISOString(),updatedAt:today.toISOString()};
 const s=setup({[keys.saved]:[oldId],[keys.current]:{date,verseId:oldId},[keys.records]:[record],[keys.history]:[{date,verseId:oldId}]});s.run();
 const c=vm.createContext({window:{},localStorage:s.storage});
 for(const f of ['topics','verses','daily-reflections'])vm.runInContext(fs.readFileSync(path.join(root,'dist/data/'+f+'.js'),'utf8'),c);
 const app=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');
 vm.runInContext(app.slice(app.indexOf('function readableVerses('),app.indexOf('try{window.Malsseum.services.migrateVerseIds')),c);
 vm.runInContext(app.slice(app.indexOf('const SavedVerses='),app.indexOf('function refreshSaveButtons')),c);
 vm.runInContext(fs.readFileSync(path.join(root,'dist/services/dailySelection.js'),'utf8'),c);
 vm.runInContext(app.slice(app.indexOf('const DailyVerse='),app.indexOf('const PersonalReflections=')),c);
 const personal=app.slice(app.indexOf('const PersonalReflections='));vm.runInContext(personal.slice(0,personal.indexOf('})();')+5),c);
 assert.equal(vm.runInContext('SavedVerses.has("'+newId+'")',c),true);
 assert.ok(vm.runInContext('DailyVerse.get().id',c));
 assert.equal(vm.runInContext('PersonalReflections.forVerseToday("'+newId+'").content',c),record.content);
 assert.equal(vm.runInContext('window.Malsseum.data.verses.find(v=>v.id===PersonalReflections.list()[0].verseId).reference',c),'시편 46:1–3');
});
