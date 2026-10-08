/* Opt-in, read-only viewport diagnostics. No input values, storage or network. */
(()=>{
 'use strict';
 if(new URLSearchParams(location.search).get('viewport-debug')!=='1')return;
 const host=document.createElement('aside');
 host.id='viewport-debug';
 host.style.cssText='position:fixed;left:8px;top:8px;width:calc(100% - 16px);max-width:374px;z-index:2147483647;pointer-events:none;contain:layout style;overflow:hidden;';
 const root=host.attachShadow({mode:'open'});
 root.innerHTML=`<style>
 :host{font:12px/1.45 monospace;color:#fff;text-align:left}
 section{background:#20332ff2;border:1px solid #90aa9c;border-radius:8px;padding:8px;box-sizing:border-box}
 button{pointer-events:auto;font:inherit;color:inherit;background:#344e44;border:1px solid #90aa9c;border-radius:5px;padding:5px 9px;min-height:32px}
 pre{margin:6px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;max-height:inherit}
 #body{overflow:auto;pointer-events:auto;overscroll-behavior:contain}
 #probe{position:fixed;inset:0 auto auto 0;width:0;height:100dvh;visibility:hidden;pointer-events:none}
 </style><section><button type="button" aria-expanded="true">viewport 진단 · 접기</button><div id="body"><pre></pre></div></section><div id="probe"></div>`;
 document.body.append(host);
 const button=root.querySelector('button'),body=root.querySelector('#body'),output=root.querySelector('pre'),probe=root.querySelector('#probe');
 // Toggling the diagnostic panel must not blur the app's focused editor.
 button.addEventListener('pointerdown',event=>event.preventDefault());
 button.addEventListener('click',()=>{body.hidden=!body.hidden;button.setAttribute('aria-expanded',String(!body.hidden));button.textContent=body.hidden?'viewport 진단 · 펼치기':'viewport 진단 · 접기';});
 const round=n=>Number.isFinite(n)?Math.round(n*100)/100:null;
 const rect=e=>e?{top:round(e.getBoundingClientRect().top),bottom:round(e.getBoundingClientRect().bottom),height:round(e.getBoundingClientRect().height)}:null;
 let lastOpen=null,lastClosed=null;
 function sample(){
  const app=document.querySelector('.app');if(!app)return;
  const vv=window.visualViewport,main=document.querySelector('#main-content'),nav=document.querySelector('#bottom-nav');
  const box=rect(app),open=app.classList.contains('is-journal-keyboard-open');
  const bottom=vv?vv.offsetTop+vv.height:innerHeight;
  const pointY=Math.min(innerHeight-1,bottom-1);
  const hit=document.elementFromPoint(innerWidth/2,Math.max(0,pointY));
  // Only identify known layout containers; never read text or arbitrary DOM attributes.
  const surface=hit===document.body?'body':hit===document.documentElement?'html':hit&&app.contains(hit)?'앱 내부':hit===host?'진단 패널':'other/unknown';
  const data={open,inner:innerHeight,vh:round(vv?.height),offset:round(vv?.offsetTop),page:round(vv?.pageTop),scale:round(vv?.scale),box,gap:round(bottom-box.bottom),scroll:round(scrollY),mainScroll:round(main?.scrollTop)};
  if(open)lastOpen=data;else lastClosed=data;
  host.style.transform=`translateY(${vv?.offsetTop||0}px)`;
  body.style.maxHeight=Math.max(70,Math.min(310,(vv?.height||innerHeight)-64))+'px';
  const brief=s=>s?`vv=${s.vh} offset=${s.offset} app.bottom=${s.box.bottom} gap=${s.gap} scrollY=${s.scroll}`:'아직 없음';
  output.textContent=[
   `앱 키보드 판정: ${open?'열림':'닫힘/미감지'} (OS 판정 아님)`,
   `입력 포커스: ${Boolean(document.activeElement?.matches('input,textarea,[contenteditable="true"]'))}`,
   `innerHeight=${innerHeight} / 100dvh=${round(probe.getBoundingClientRect().height)}`,
   `visualViewport.height=${data.vh} scale=${data.scale}`,
   `offsetTop=${data.offset} pageTop=${data.page}`,
   `app.top=${box.top} height=${box.height} bottom=${box.bottom}`,
   `표시영역 하단−app.bottom=${data.gap}px`,
   `임시 높이=${app.style.getPropertyValue('--journal-viewport-height')||'없음'}`,
   `scrollY=${data.scroll} main.scrollTop=${data.mainScroll}`,
   `문서 높이=${document.documentElement.scrollHeight} / 폭=${document.documentElement.scrollWidth}`,
   `탭=${nav?getComputedStyle(nav).display:'없음'} bottom=${rect(nav)?.bottom}`,
   `하단 요소=${surface} / body 배경=${getComputedStyle(document.body).backgroundColor}`,
   `최근 열림: ${brief(lastOpen)}`,
   `최근 닫힘: ${brief(lastClosed)}`,
   '단위 CSS px · 화면 표시만 · 입력 내용/저장/전송 없음'
  ].join('\n');
 }
 sample();
 const timer=setInterval(sample,250);
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();
