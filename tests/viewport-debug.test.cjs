const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('dist/viewport-debug.js','utf8');

test('viewport diagnostics leave normal URLs completely inactive',()=>{
 for(const search of ['', '?viewport-debug=0', '?viewport-debug=true', '?other=1']){
  vm.runInNewContext(source,{URLSearchParams,location:{search}});
 }
});
test('viewport diagnostics activate only with the explicit flag',()=>{
 let reached=false;
 const sentinel=new Error('diagnostic DOM requested');
 assert.throws(()=>vm.runInNewContext(source,{
  URLSearchParams,location:{search:'?viewport-debug=1'},
  document:{createElement(){reached=true;throw sentinel;}}
 }),error=>error===sentinel);
 assert.equal(reached,true);
});
