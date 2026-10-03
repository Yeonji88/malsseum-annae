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
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(Object.entries(data.dailyReflections).slice(50))).digest('hex'),'c9c82bccc65fa0ef441336f7146a0b65b9f8e5d54c8470ca2dff4973ca57047b');
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

test('approved Daily 21-25 matches exact copy and extracts existing verse boundaries without altering shared data',()=>{
 const c=vm.createContext({window:{Malsseum:{data:{}}}});for(const f of ['verses','daily-reflections'])vm.runInContext(fs.readFileSync('dist/data/'+f+'.js','utf8'),c);const d=c.window.Malsseum.data;
 assert.deepEqual(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(d.dailyReflections).slice(20,25)))),require('./fixtures/daily-approved-twenty-one-five.json'));
 for(const [id,old] of [['psalm-131-2','psalm-131-1-2'],['ecclesiastes-4-10','ecclesiastes-4-9-10']]){assert.equal(d.dailyVerseOverrides[id].text,d.verses.find(v=>v.id===old).text.split('\n')[1]);assert(d.legacyDailyReflections[old]);assert(!Object.hasOwn(d.dailyReflections,old));}
});

test('approved Daily 26-30 matches exact copy and Luke 12:22 uses existing first verse',()=>{
 const c=vm.createContext({window:{Malsseum:{data:{}}}});for(const f of ['verses','daily-reflections'])vm.runInContext(fs.readFileSync('dist/data/'+f+'.js','utf8'),c);const d=c.window.Malsseum.data;
 assert.deepEqual(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(d.dailyReflections).slice(25,30)))),require('./fixtures/daily-approved-twenty-six-thirty.json'));
 assert.equal(d.dailyVerseOverrides['luke-12-22'].text,d.verses.find(v=>v.id==='luke-12-22-24').text.split('\n')[0]);assert(d.legacyDailyReflections['luke-12-22-24']);assert(!Object.hasOwn(d.dailyReflections,'luke-12-22-24'));
});

test('approved Daily 31-35 matches exact copy and extracts source first verses',()=>{
 const c=vm.createContext({window:{Malsseum:{data:{}}}});for(const f of ['verses','daily-reflections'])vm.runInContext(fs.readFileSync('dist/data/'+f+'.js','utf8'),c);const d=c.window.Malsseum.data;
 assert.deepEqual(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(d.dailyReflections).slice(30,35)))),require('./fixtures/daily-approved-thirty-one-five.json'));
 for(const [id,old] of [['isaiah-49-15','isaiah-49-15-16'],['lamentations-3-22','lamentations-3-22-23']]){assert.equal(d.dailyVerseOverrides[id].text,d.verses.find(v=>v.id===old).text.split('\n')[0]);assert(d.legacyDailyReflections[old]);assert(!Object.hasOwn(d.dailyReflections,old));}
});

test('approved Daily 36-40 matches exact copy, preserves Psalm 121 range and extracts Proverbs 3:5',()=>{
 const c=vm.createContext({window:{Malsseum:{data:{}}}});for(const f of ['verses','daily-reflections'])vm.runInContext(fs.readFileSync('dist/data/'+f+'.js','utf8'),c);const d=c.window.Malsseum.data;
 assert.deepEqual(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(d.dailyReflections).slice(35,40)))),require('./fixtures/daily-approved-thirty-six-forty.json'));assert.equal(d.dailyVerseOverrides['proverbs-3-5'].text,d.verses.find(v=>v.id==='proverbs-3-5-6').text.split('\n')[0]);assert(d.legacyDailyReflections['proverbs-3-5-6']);assert(!Object.hasOwn(d.dailyReflections,'proverbs-3-5-6'));const v=d.verses.find(v=>v.id==='psalm-121-1-2');assert.equal(v.verseStart,1);assert.equal(v.verseEnd,2);assert.equal(v.text.split('\n').length,2);
});

test('approved Daily 41-45 matches exact copy and retains original range guidance',()=>{
 const c=vm.createContext({window:{Malsseum:{data:{}}}});for(const f of ['verses','daily-reflections'])vm.runInContext(fs.readFileSync('dist/data/'+f+'.js','utf8'),c);const d=c.window.Malsseum.data;
 assert.deepEqual(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(d.dailyReflections).slice(40,45)))),require('./fixtures/daily-approved-forty-one-five.json'));
 for(const [id,old,start] of [['isaiah-55-9','isaiah-55-8-9',1],['matthew-10-30-31','matthew-10-29-31',1]]){assert.equal(d.dailyVerseOverrides[id].text,d.verses.find(v=>v.id===old).text.split('\n').slice(start).join('\n'));assert(d.legacyDailyReflections[old]);assert(!Object.hasOwn(d.dailyReflections,old));}
});

test('approved Daily 46-50 matches exact copy and retains existing single-verse scripture',()=>{
 const c=vm.createContext({window:{Malsseum:{data:{}}}});for(const f of ['verses','daily-reflections'])vm.runInContext(fs.readFileSync('dist/data/'+f+'.js','utf8'),c);const d=c.window.Malsseum.data;const expected=require('./fixtures/daily-approved-forty-six-fifty.json');assert.deepEqual(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(d.dailyReflections).slice(45,50)))),expected);for(const id of Object.keys(expected)){const v=d.verses.find(v=>v.id===id);assert(v);assert.equal(v.verseStart,v.verseEnd);}
});
