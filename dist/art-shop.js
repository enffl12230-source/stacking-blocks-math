'use strict';

const artTools = {
  size:{name:'크기 조절',price:1,legacy:'brush',detail:'작품 전체를 작게 또는 크게 보여 줘요.'},
  background:{name:'배경 고르기',price:2,legacy:'stamp',detail:'내 작품에 어울리는 풍경을 골라요.'},
  bubble:{name:'말풍선 넣기',price:2,legacy:'copy',detail:'내 장난감이 할 말을 직접 써요.'}
};
const defaultArtStyle={scale:1,background:'plain',bubble:''};
let artStyle={...defaultArtStyle};
const walletPrefix='block-festival-wallet-v1/';
const memoryFlags=new Set();
let artTool=null;
function ownsTool(key){return walletHas('tool/'+key) || walletHas('tool/'+artTools[key].legacy);}
function walletHas(flag) {
  try { return memoryFlags.has(flag) || localStorage.getItem(walletPrefix+flag)==='1'; }
  catch { return memoryFlags.has(flag); }
}
function markWallet(flag) {
  memoryFlags.add(flag);
  try { localStorage.setItem(walletPrefix+flag,'1'); } catch { /* Keep the current game playable. */ }
}
function creditBalance() {
  const earned=questions.filter((_,i)=>walletHas('clue/'+i)).length;
  const spent=Object.entries(artTools).reduce((sum,[key,tool])=>sum+(ownsTool(key) ? tool.price : 0),0);
  return earned-spent;
}
function claimClue(index) {
  if (walletHas('clue/'+index)) return false;
  markWallet('clue/'+index);
  refreshShop();
  return true;
}
function toolInstruction() {
  return '윗면은 위로, 옆면은 옆으로 붙어요. 옮기려면 꾹 누르고 끌어요.';
}
function refreshShop() {
  const balance=creditBalance();
  for (const el of document.querySelectorAll('[data-balance]')) el.textContent='별빛 크레딧 '+balance+'개';
  for (const button of document.querySelectorAll('[data-shop-tool]')) {
    const key=button.dataset.shopTool, tool=artTools[key], owned=ownsTool(key);
    button.disabled=!owned && balance<tool.price;
    button.textContent=owned ? (artTool===key ? '사용 중' : '도구 쓰기') : tool.price+'크레딧으로 사기';
    button.setAttribute('aria-label',tool.name+' '+button.textContent);
    if (owned) button.setAttribute('aria-pressed',String(artTool===key));
    else button.removeAttribute('aria-pressed');
  }
  const panel=document.querySelector('#art-options');
  panel.hidden=active!=='art' || !artTool;
  for(const row of panel.querySelectorAll('[data-options]'))row.hidden=row.dataset.options!==artTool;
  document.querySelector('#build-tool').hidden=!artTool;
  document.querySelector('#art-size').value=String(artStyle.scale);
  document.querySelector('#art-background').value=artStyle.background;
  document.querySelector('#bubble-text').value=artStyle.bubble;
}
function equipTool(key,bought=false) {
  artTool=key;
  refreshShop();
  document.querySelector('#shop-status').textContent=key ? artTools[key].name+(bought?' 구입!':' 선택!') : '';
  if (key) {
    const field=document.querySelector('[data-options="'+key+'"] input, [data-options="'+key+'"] select');
    field.focus({preventScroll:true});document.querySelector('#art-options').scrollIntoView({block:'start'});
  }
}
async function useShopItem(key) {
  function purchase() {
    if (active!=='art') return;
    if (ownsTool(key)) { equipTool(key); return; }
    if (creditBalance()<artTools[key].price) { refreshShop();return; }
    markWallet('tool/'+key);
    equipTool(key,true);
  }
  if (navigator.locks) await navigator.locks.request(walletPrefix+'purchase',purchase);
  else purchase();
}
function changeArtStyle(key,value){
  if(active!=='art' || !ownsTool({scale:'size',background:'background',bubble:'bubble'}[key]) || artStyle[key]===value)return;
  saveUndo();artStyle[key]=value;refreshShop();updateBoard();
}
document.querySelector('#art-size').addEventListener('change',e=>changeArtStyle('scale',Number(e.target.value)));
document.querySelector('#art-background').addEventListener('change',e=>changeArtStyle('background',e.target.value));
document.querySelector('[data-options="bubble"]').addEventListener('submit',e=>{
  e.preventDefault();changeArtStyle('bubble',document.querySelector('#bubble-text').value.trim().slice(0,24));
});
document.querySelector('#bubble-remove').addEventListener('click',()=>changeArtStyle('bubble',''));
const artScenes={
  forest:'<rect width="560" height="380" fill="#cde8db"/><circle cx="440" cy="64" r="34" fill="#fff4b5"/><path d="M0 235 Q125 140 260 235 T560 211V380H0Z" fill="#a0c9a5"/><path d="M0 286 Q190 216 340 272 T560 247V380H0Z" fill="#76a58a"/><path d="m32 270 28-68 28 68Zm36-8 24-61 26 61Zm414 19 31-82 34 82Z" fill="#467b66"/>',
  sunset:'<rect width="560" height="380" fill="#ffd9ba"/><circle cx="420" cy="137" r="45" fill="#ffef9c"/><path d="M0 241 120 156 224 228 352 143 560 252V380H0Z" fill="#cf91a3"/><path d="M0 284 146 221 247 268 415 196 560 250V380H0Z" fill="#a67d98"/><path d="M0 308Q150 277 280 312T560 292V380H0Z" fill="#806e93"/>',
  night:'<rect width="560" height="380" fill="#283854"/><path d="M477 37a27 27 0 1 0 22 41 25 25 0 0 1-22-41Z" fill="#ffe6a4"/><path d="m48 43 3 7 7 2-7 3-3 7-2-7-7-3 7-2Zm129 45 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm151-50 3 6 6 2-6 3-3 6-2-6-6-3 6-2Z" fill="#fff2c4"/><path d="M0 267Q125 190 270 261T560 220V380H0Z" fill="#445775"/><path d="M0 319Q182 261 300 310T560 285V380H0Z" fill="#374661"/>'
};
function decorateArtBoard(svg){
  const box=svg.viewBox.baseVal;
  function overlay(kind){
    return svgNode('svg',{x:box.x,y:box.y,width:box.width,height:box.height,viewBox:'0 0 560 380','data-art-decoration':kind,'pointer-events':'none','aria-hidden':'true'});
  }
  if(artScenes[artStyle.background]){
    const bg=overlay('background');bg.innerHTML=artScenes[artStyle.background];svg.prepend(bg);
  }
  if(artStyle.bubble){
    const bubble=overlay('bubble'), chars=Array.from(artStyle.bubble);
    const lines=[chars.slice(0,12).join(''),chars.slice(12).join('')].filter(Boolean);
    const width=Math.max(64,Math.max(...lines.map(line=>Array.from(line).length))*16+28),height=lines.length*20+14;
    bubble.append(svgNode('rect',{x:12,y:10,width,height,rx:12,fill:'#fffaf0',stroke:'#665360','stroke-width':2}),
      svgNode('path',{d:'M34 '+(height+9)+'l3 11 14-11',fill:'#fffaf0',stroke:'#665360','stroke-width':2}));
    lines.forEach((line,i)=>{
      const text=svgNode('text',{x:25,y:32+i*20,'font-size':16,fill:'#303545'});text.textContent=line;bubble.append(text);
    });
    svg.append(bubble);
  }
}
const toolPictures={
  size:'<path d="M7 22V7h15m19 19v15H26M8 8l13 13m19 19L27 27" fill="none" stroke="#527ca8" stroke-width="4"/>',
  background:'<rect x="4" y="8" width="40" height="32" rx="5" fill="#a8ddda"/><circle cx="33" cy="17" r="5" fill="#ffdd75"/><path d="m5 37 13-16 8 9 6-6 11 13Z" fill="#80b082"/>',
  bubble:'<path d="M10 8h28q6 0 6 6v13q0 6-6 6H23l-10 8v-8h-3q-6 0-6-6V14q0-6 6-6Z" fill="#f4c593"/><path d="M12 20h23" stroke="#77596c" stroke-width="3"/>'
};
for (const [key,tool] of Object.entries(artTools)) {
  const card=document.createElement('article');
  const img=svgNode('svg',{viewBox:'0 0 48 48','aria-hidden':'true',stroke:'#674c4a','stroke-width':1.7,'stroke-linejoin':'round'});
  img.innerHTML=toolPictures[key];
  const title=document.createElement('h3'), text=document.createElement('p'), button=document.createElement('button');
  title.textContent=tool.name;text.textContent=tool.detail;
  button.type='button'; button.dataset.shopTool=key;
  button.addEventListener('click',()=>useShopItem(key));
  card.append(img,title,text,button);document.querySelector('#shop-items').append(card);
}
document.querySelector('#build-tool').addEventListener('click',()=>equipTool(null));
window.addEventListener('storage',event=>{if (!event.key || event.key.startsWith(walletPrefix)) refreshShop();});
