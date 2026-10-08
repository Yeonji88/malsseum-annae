const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){const s=fs.readFileSync('dist/app.js','utf8');const c=vm.createContext({});vm.runInContext(s.slice(s.indexOf('const recordPages='),s.indexOf('function recordPagination(')),c);return c;}
test('10-item pagination preserves order and clamps empty/deleted last pages',()=>{
 for(const count of [0,1,10,11,20,21]){const c=setup(),records=Array.from({length:count},(_,i)=>({id:String(i)})),before=JSON.stringify(records);c.records=records;
  for(let page=1;page<=Math.max(1,Math.ceil(count/10));page++){c.page=page;const result=vm.runInContext("recordPages.saved=page;pageRecords(records,'saved')",c);assert.equal(result.length,Math.min(10,Math.max(0,count-(page-1)*10)));assert.equal(JSON.stringify(result),JSON.stringify(records.slice((page-1)*10,page*10)));}
  vm.runInContext("recordPages.saved=100;pageRecords(records,'saved')",c);assert.equal(vm.runInContext('recordPages.saved',c),Math.max(1,Math.ceil(count/10)));assert.equal(JSON.stringify(records),before);
 }
});
test('record lookup selects its page and each list retains independent in-memory state',()=>{const c=setup();c.records=Array.from({length:21},(_,i)=>({id:String(i)}));vm.runInContext("recordPages.saved=2;pageRecords(records,'reflections','20')",c);assert.equal(vm.runInContext('recordPages.reflections',c),3);assert.equal(vm.runInContext('recordPages.saved',c),2);vm.runInContext("pageRecords(records,'reflections','missing')",c);assert.equal(vm.runInContext('recordPages.reflections',c),3);});
