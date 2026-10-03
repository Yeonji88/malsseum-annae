const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const expected=require('./fixtures/daily-approved-five.json');
test('approved Daily 1-5 matches exact copy, single-verse sources, and retained legacy record guidance',()=>{
 const c=vm.createContext({window:{Malsseum:{data:{}}}});vm.runInContext(fs.readFileSync('dist/data/verses.js','utf8'),c);
 const data=c.window.Malsseum.data,shared=JSON.stringify(data.verses);
 vm.runInContext(fs.readFileSync('dist/data/daily-reflections.js','utf8'),c);
 assert.deepEqual(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(data.dailyReflections).slice(0,5)))),expected);
 assert.equal(JSON.stringify(data.verses),shared);
 assert.equal(data.dailyVerseOverrides['psalm-139-14'].text,data.verses.find(v=>v.id==='psalm-139-13-14').text.split('\n')[1]);
 for(const id of ['psalm-143-8','psalm-139-14'])assert.equal(data.dailyVerseOverrides[id].verseStart,data.dailyVerseOverrides[id].verseEnd);
 for(const id of ['john-11-35','psalm-139-13-14']){assert(!Object.hasOwn(data.dailyReflections,id));assert(data.legacyDailyReflections[id]);assert(data.verses.find(v=>v.id===id));}
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(Object.entries(data.dailyReflections).slice(20))).digest('hex'),'0d3ad531bd7f21f2b5579ad76ad9c9f680bf30edc9dd00e21c441e8cbf0e5708');
});

test('approved Daily 6-10 uses exact copy and Psalm 23:2 retains legacy range compatibility',()=>{
 const c=vm.createContext({window:{Malsseum:{data:{}}}});
 for(const f of ['verses','daily-reflections'])vm.runInContext(fs.readFileSync('dist/data/'+f+'.js','utf8'),c);
 const d=c.window.Malsseum.data;
 assert.deepEqual(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(d.dailyReflections).slice(5,10)))),require('./fixtures/daily-approved-six-ten.json'));
 const v=d.dailyVerseOverrides['psalm-23-2'];assert.equal(v.text,d.verses.find(v=>v.id==='psalm-23-2-3').text.split('\n')[0]);assert.equal(v.verseStart,2);assert.equal(v.verseEnd,2);
 assert(!Object.hasOwn(d.dailyReflections,'psalm-23-2-3'));assert(d.legacyDailyReflections['psalm-23-2-3']);
});

test('approved Daily 11-15 matches exact copy and keeps Galatians concern/legacy guidance',()=>{
 const c=vm.createContext({window:{Malsseum:{data:{}}}});
 for(const f of ['verses','daily-reflections'])vm.runInContext(fs.readFileSync('dist/data/'+f+'.js','utf8'),c);
 const d=c.window.Malsseum.data;
 assert.deepEqual(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(d.dailyReflections).slice(10,15)))),require('./fixtures/daily-approved-eleven-fifteen.json'));
 assert.equal(d.dailyVerseOverrides['psalm-19-14'].text,'나의 반석이시요 나의 구속자이신 여호와여 내 입의 말과 마음의 묵상이 주님 앞에 열납되기를 원하나이다');
 assert(d.verses.find(v=>v.id==='galatians-6-2'));assert(d.legacyDailyReflections['galatians-6-2']);assert(!Object.hasOwn(d.dailyReflections,'galatians-6-2'));
});

test('approved Daily 16-20 matches exact copy and uses existing single-verse scripture',()=>{
 const c=vm.createContext({window:{Malsseum:{data:{}}}});
 for(const f of ['verses','daily-reflections'])vm.runInContext(fs.readFileSync('dist/data/'+f+'.js','utf8'),c);
 const d=c.window.Malsseum.data;assert.deepEqual(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(d.dailyReflections).slice(15,20)))),require('./fixtures/daily-approved-sixteen-twenty.json'));
 for(const id of Object.keys(require('./fixtures/daily-approved-sixteen-twenty.json'))){const v=d.verses.find(v=>v.id===id);assert(v);assert.equal(v.verseStart,v.verseEnd);}
});
