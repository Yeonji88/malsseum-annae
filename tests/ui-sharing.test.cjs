const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/app.js'),'utf8');
const shareSource=source.slice(source.indexOf('async function shareDailyVerse('),source.indexOf('function meditationBackButton('));
for(const mode of ['native','unsupported','failure','cancel','clipboard-failure','unavailable']){
 test('share: '+mode,async()=>{
  const calls=[],status={textContent:'old feedback'};
  const navigator={};
  if(!['unsupported','unavailable','clipboard-failure'].includes(mode))navigator.share=async data=>{calls.push(['share',data]);if(mode!=='native')throw Object.assign(new Error(),{name:mode==='cancel'?'AbortError':'NotAllowedError'});};
  if(mode!=='unavailable')navigator.clipboard={writeText:async text=>{calls.push(['copy',text]);if(mode==='clipboard-failure')throw Error('denied');}};
  const c=vm.createContext({navigator,displayVerseText:v=>v.text});vm.runInContext(shareSource,c);
  await c.shareDailyVerse({text:'본문',reference:'시편 56:3'},status);
  if(mode==='native'){assert.equal(calls.length,1);assert.equal(calls[0][1].url,'https://yeonji88.github.io/malsseum-annae/');assert.match(calls[0][1].text,/본문.*\n.*시편 56:3/s);assert.equal(status.textContent,'');}
  if(mode==='cancel'){assert.equal(calls.length,1);assert.equal(status.textContent,'');}
  if(['unsupported','failure'].includes(mode)){assert.match(calls.at(-1)[1],/본문[\s\S]*시편 56:3[\s\S]*https:\/\/yeonji88.github.io\/malsseum-annae\//);assert.equal(status.textContent,'말씀을 복사했어요.');}
  if(['clipboard-failure','unavailable'].includes(mode))assert.equal(status.textContent,'공유하거나 복사하지 못했어요. 잠시 후 다시 시도해주세요.');
 });
}
