const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
 const scope={window:{Malsseum:{}}};vm.runInNewContext(fs.readFileSync('dist/android-back.js','utf8'),scope);
 const state={time:1,key:'root',root:true,keyboard:false,overlay:false,editor:false,parent:false,exits:0,notice:false,events:[],timer:null};
 const controller=scope.window.Malsseum.createAndroidBack({
  contextKey:()=>state.key,now:()=>state.time,schedule:fn=>(state.timer=fn,1),cancel:()=>{state.timer=null;},
  keyboardOpen:()=>state.keyboard,dismissKeyboard:()=>state.events.push('keyboard'),
  closeOverlay:()=>{if(!state.overlay)return false;state.events.push('overlay');return true;},
  closeEditor:()=>{if(!state.editor)return false;state.events.push('editor');return true;},
  goToParent:()=>{if(!state.parent)return false;state.events.push('parent');return true;},
  isRoot:()=>state.root,exit:async()=>{state.exits++;},notice:v=>{state.notice=v;}
 });return {state,controller};
}
test('Android root requires two Back events within 2 seconds',async()=>{const {state:s,controller:c}=setup();await c.back();assert(s.notice);assert.equal(s.exits,0);s.time+=1999;await c.back();assert.equal(s.exits,1);assert(!s.notice);});
test('expired root confirmation starts again',async()=>{const {state:s,controller:c}=setup();await c.back();s.time+=2000;await c.back();assert.equal(s.exits,0);assert(s.notice);s.timer();assert(!s.notice);});
test('modal precedes editor and parent, and never exits',async()=>{const {state:s,controller:c}=setup();s.overlay=s.editor=s.parent=true;await c.back();assert.deepEqual(s.events,['overlay']);assert.equal(s.exits,0);});
test('editor precedes parent',async()=>{const {state:s,controller:c}=setup();s.editor=s.parent=true;await c.back();assert.deepEqual(s.events,['editor']);});
test('parent is handled before root confirmation',async()=>{const {state:s,controller:c}=setup();s.parent=true;await c.back();assert.deepEqual(s.events,['parent']);assert(!s.notice);});
test('keyboard guard consumes only keyboard event (device validation still required)',async()=>{const {state:s,controller:c}=setup();s.keyboard=s.overlay=true;await c.back();assert.deepEqual(s.events,['keyboard']);assert.equal(s.exits,0);});
test('context changes and background reset disarm exit',async()=>{const {state:s,controller:c}=setup();await c.back();s.key='other';c.changed();assert(!s.notice);await c.back();assert.equal(s.exits,0);c.reset();await c.back();assert.equal(s.exits,0);});
test('unrecognized non-root cannot exit',async()=>{const {state:s,controller:c}=setup();s.root=false;await c.back();await c.back();assert.equal(s.exits,0);assert(!s.notice);});
