// Local integration check; temporary TLS credentials live in ignored tmp/.
const {chromium}=require('playwright');
const https=require('node:https'),fs=require('node:fs'),os=require('node:os');
const assert=require('node:assert/strict');
const {createServer}=require('../tools/daily-preview-server.cjs');
(async()=>{
 const http=createServer();
 const tls=https.createServer({key:fs.readFileSync('tmp/share-test.key'),cert:fs.readFileSync('tmp/share-test.pem')},http.listeners('request')[0]);
 await new Promise(r=>http.listen(0,'0.0.0.0',r));await new Promise(r=>tls.listen(0,'127.0.0.1',r));
 const ip=Object.values(os.networkInterfaces()).flat().find(i=>i.family==='IPv4'&&!i.internal).address;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({ignoreHTTPSErrors:true});const page=await context.newPage();
  await page.goto(`http://${ip}:${http.address().port}/`);
  const insecure=await page.evaluate(()=>({secure:isSecureContext,share:typeof navigator.share,clipboard:typeof navigator.clipboard}));
  assert.equal(insecure.secure,false);assert.equal(insecure.share,'undefined');assert.equal(insecure.clipboard,'undefined');
  console.log('LAN HTTP:',insecure);
  await context.addInitScript(()=>localStorage.setItem('malsseum-annae.display-name.v1','검수'));
  await page.goto(`https://localhost:${tls.address().port}/`);await page.waitForSelector('.meditation-primary');await page.locator('.meditation-primary').click();
  assert.equal(await page.evaluate(()=>isSecureContext),true);
  await page.evaluate(()=>{window.shareTest=null;Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.shareTest={data,active:navigator.userActivation.isActive,secure:isSecureContext};}});});
  await page.getByRole('button',{name:'공유하기',exact:true}).click();
  const result=await page.evaluate(()=>window.shareTest);assert.ok(result.secure&&result.active);assert.ok(result.data.text&&result.data.url.startsWith('https://'));
  assert.equal(await page.locator('.meditation-share-status').textContent(),'');
  console.log('HTTPS click: secure context, transient activation, share payload verified (share API spy).');
 }finally{await browser.close();await Promise.all([new Promise(r=>http.close(r)),new Promise(r=>tls.close(r))]);}
})().catch(e=>{console.error(e);process.exitCode=1;});
