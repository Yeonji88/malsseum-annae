const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../dist/app.js'),'utf8');
const shareSource=source.slice(
 source.indexOf('async function shareDailyVerse('),
 source.indexOf('function meditationBackButton(')
);

function context({nativeShare,navigator={}}={}){
 const window={};
 if(nativeShare)window.malsseumNativeShare=nativeShare;
 const c=vm.createContext({
  window,
  navigator,
  displayVerseText:v=>v.text
 });
 vm.runInContext(shareSource,c);
 return c;
}

test('daily verse uses native share with verse deep link',async()=>{
 const calls=[],status={textContent:'old'};
 const c=context({
  nativeShare:async(...args)=>calls.push(args),
  navigator:{}
 });
 const verse={id:'psalm-56-3',text:'본문',reference:'시편 56:3'};
 await c.shareDailyVerse(verse,status);

 assert.equal(calls.length,1);
 assert.equal(calls[0][2],'https://yeonji88.github.io/malsseum-annae/?verse=psalm-56-3');
 assert.match(calls[0][1],/본문[\s\S]*시편 56:3/);
 assert.equal(status.textContent,'');
});

test('daily verse falls back to browser share',async()=>{
 const calls=[],status={textContent:'old'};
 const navigator={
  share:async data=>calls.push(data)
 };
 const c=context({navigator});
 const verse={id:'psalm-56-3',text:'본문',reference:'시편 56:3'};
 await c.shareDailyVerse(verse,status);

 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://yeonji88.github.io/malsseum-annae/?verse=psalm-56-3');
 assert.equal(status.textContent,'');
});

test('daily verse falls back to clipboard when sharing fails',async()=>{
 const copied=[],status={textContent:'old'};
 const navigator={
  share:async()=>{throw Object.assign(new Error('blocked'),{name:'NotAllowedError'});},
  clipboard:{writeText:async text=>copied.push(text)}
 };
 const c=context({navigator});
 await c.shareDailyVerse(
  {id:'psalm-56-3',text:'본문',reference:'시편 56:3'},
  status
 );

 assert.equal(copied.length,1);
 assert.match(copied[0],/본문[\s\S]*시편 56:3[\s\S]*\?verse=psalm-56-3/);
 assert.equal(status.textContent,'말씀을 복사했어요.');
});

test('daily verse cancel does not copy or show an error',async()=>{
 const copied=[],status={textContent:'old'};
 const navigator={
  share:async()=>{throw Object.assign(new Error('cancel'),{name:'AbortError'});},
  clipboard:{writeText:async text=>copied.push(text)}
 };
 const c=context({navigator});
 await c.shareDailyVerse(
  {id:'psalm-56-3',text:'본문',reference:'시편 56:3'},
  status
 );

 assert.equal(copied.length,0);
 assert.equal(status.textContent,'');
});

test('personal reflection native share contains only heading, saved reflection and verse link',async()=>{
 const calls=[],status={textContent:'old'};
 const c=context({
  nativeShare:async(...args)=>calls.push(args),
  navigator:{}
 });
 const verse={id:'2-corinthians-10-12',text:'말씀 본문',reference:'고린도후서 10:12'};
 const record={content:'오늘 마음에 남은 묵상'};
 const result=await c.sharePersonalReflection(verse,record,status);

 assert.equal(result,true);
 assert.equal(calls.length,1);
 assert.equal(calls[0][1],'🙏 나의 묵상\n오늘 마음에 남은 묵상');
 assert.equal(calls[0][2],'https://yeonji88.github.io/malsseum-annae/?verse=2-corinthians-10-12');
 assert.doesNotMatch(calls[0][1],/말씀 본문|고린도후서|말씀 안에/);
});

test('personal reflection refuses an unsaved empty record',async()=>{
 const calls=[],status={textContent:'old'};
 const c=context({
  nativeShare:async(...args)=>calls.push(args),
  navigator:{}
 });
 const result=await c.sharePersonalReflection(
  {id:'psalm-56-3'},
  null,
  status
 );

 assert.equal(result,false);
 assert.equal(calls.length,0);
});
