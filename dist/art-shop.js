'use strict';

const artTools = {
  brush:{name:'색칠 붓', price:1, detail:'이미 놓은 블록의 색을 바꿔요.', help:'원하는 색을 고르고 색칠할 블록을 톡 눌러요.'},
  stamp:{name:'별 도장', price:2, detail:'블록 윗면에 별을 찍어요.', help:'별을 찍을 블록을 톡 눌러요.'},
  copy:{name:'복사 집게', price:2, detail:'같은 블록을 하나 더 놓아요.', help:'복사할 블록을 누른 다음, 새 블록을 놓을 자리를 눌러요.'}
};
const starOutline=Array.from({length:10},(_,i)=>{
  const angle=-Math.PI/2+i*Math.PI/5, r=i%2 ? .46 : 1;
  return [Math.cos(angle)*r,Math.sin(angle)*r];
});
const walletPrefix='block-festival-wallet-v1/';
const memoryFlags=new Set();
let artTool='build', copySource=null;
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
  const spent=Object.entries(artTools).reduce((sum,[key,tool])=>sum+(walletHas('tool/'+key) ? tool.price : 0),0);
  return earned-spent;
}
function claimClue(index) {
  if (walletHas('clue/'+index)) return false;
  markWallet('clue/'+index);
  refreshShop();
  return true;
}
function toolInstruction() {
  if (artTool==='build') return '색을 고르고 작업판을 누르거나 블록을 끌어와요.';
  if (artTool==='copy' && copySource) return '새 블록을 놓을 자리를 톡 눌러요.';
  return artTools[artTool].help;
}
function refreshShop() {
  const balance=creditBalance();
  for (const el of document.querySelectorAll('[data-balance]')) el.textContent='별빛 크레딧 '+balance+'개';
  for (const button of document.querySelectorAll('[data-shop-tool]')) {
    const key=button.dataset.shopTool, tool=artTools[key], owned=walletHas('tool/'+key);
    button.disabled=!owned && balance<tool.price;
    button.textContent=owned ? (artTool===key ? '사용 중' : '도구 쓰기') : tool.price+'크레딧으로 사기';
    button.setAttribute('aria-label',tool.name+' '+button.textContent);
    if (owned) button.setAttribute('aria-pressed',String(artTool===key));
    else button.removeAttribute('aria-pressed');
  }
  document.querySelector('#build-tool').setAttribute('aria-pressed',String(artTool==='build'));
}
function equipTool(key,bought=false) {
  artTool=key;copySource=null;
  setArtSpinning(false);
  refreshShop();
  const message=(key==='build' ? '블록 쌓기' : artTools[key].name)+(bought ? ' 구입! ' : ' 선택! ')+toolInstruction();
  document.querySelector('#shop-status').textContent=message;
  tell(message);
  artBoard.focus({preventScroll:true});
  artBoard.scrollIntoView({block:'center'});
}
async function useShopItem(key) {
  function purchase() {
    if (active!=='art') return;
    if (walletHas('tool/'+key)) { equipTool(key); return; }
    if (creditBalance()<artTools[key].price) { refreshShop();return; }
    markWallet('tool/'+key);
    equipTool(key,true);
  }
  if (navigator.locks) await navigator.locks.request(walletPrefix+'purchase',purchase);
  else purchase();
}
function applyArtTool(p,id) {
  const block=artBlocks.find(b=>b.id===id);
  if (artTool==='copy' && copySource && artBlocks.some(b=>b.id===copySource.id)) {
    placeArt(p,copySource.color,undefined,copySource.stamp);
    copySource=null;
    return;
  }
  copySource=null;
  if (!block) { tell('도구를 쓸 블록을 먼저 눌러요.');return; }
  if (artTool==='copy') {
    copySource={...block};
    tell(toolInstruction());
  } else if (artTool==='brush') {
    if (block.color!==state.art.color) { saveUndo();block.color=state.art.color; }
    tell(paints[block.color].name+'으로 칠했어요.');
  } else if (artTool==='stamp') {
    if (!block.stamp) { saveUndo();block.stamp=true; }
    tell('블록 윗면에 별이 반짝여요!');
  }
}
const toolPictures = {
  brush:'<path d="m15 28 18-19q4-3 6 1L23 32Z" fill="#e99d63"/><path d="M15 27q-7 0-7 9-1 4-5 5 15 3 19-11Z" fill="#83afd1"/>',
  stamp:'<path d="M18 28v-5q-5-5-3-11 2-7 10-7t10 7q2 6-4 11v5" fill="#eabf5d"/><path d="M10 29h29l3 10H7Z" fill="#da8a85"/>',
  copy:'<path d="m15 37 4-25q1-6 7-5 6 0 7 6l4 24-6-3-5-16-5 16Z" fill="#8dc4aa"/><circle cx="26" cy="13" r="2" fill="#fff4d6"/>'
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
document.querySelector('#build-tool').addEventListener('click',()=>equipTool('build'));
window.addEventListener('storage',event=>{if (!event.key || event.key.startsWith(walletPrefix)) refreshShop();});
