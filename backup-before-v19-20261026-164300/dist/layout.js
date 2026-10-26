// Ordinary browser: compact by default. The app opens the same game with ?layout=app.
(()=>{'use strict';const requested=new URLSearchParams(location.search).get('layout');let saved=null;try{saved=sessionStorage.getItem('frontline-layout');}catch{}
const embedded=window.self!==window.top||/ChatGPT|Codex|Electron/i.test(navigator.userAgent);
let layout=requested==='app'?'large':requested==='compact'?'compact':saved||(embedded?'large':'compact');
const button=document.getElementById('fieldSize');function apply(){document.documentElement.dataset.layout=layout;button.textContent='Поле: '+(layout==='large'?'большое':'компактное');button.setAttribute('aria-pressed',String(layout==='large'));}
button.onclick=()=>{layout=layout==='large'?'compact':'large';try{sessionStorage.setItem('frontline-layout',layout);}catch{}apply();};apply();})();
