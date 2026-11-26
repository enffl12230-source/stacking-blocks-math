'use strict';

const festivalNames = {practice:'당근 계단', quiz:'별빛 보물', art:'장난감 가게'};
const stickerKey = 'block-festival-stamps-v1';
let earnedStamps = new Set();
try {
  const saved = JSON.parse(sessionStorage.getItem(stickerKey));
  if (Array.isArray(saved)) earnedStamps = new Set(saved.filter(key => Object.hasOwn(festivalNames,key)));
} catch { /* The current visit still has a stamp book when storage is unavailable. */ }

const stairs = [{index:12,height:1},{index:13,height:2},{index:14,height:3}];
const orders = [
  {name:'반짝 등대', request:'블록을 위로 붙여 두 층 이상의 등대를 만들어 줘!', theme:'stack', talk:'등대 꼭대기에 어떤 색 블록이 있나요?'},
  {name:'별빛 기차', request:'블록 두 개를 옆면끼리 붙여 기차를 만들어 줘!', theme:'side', talk:'기관차 옆에 어떤 색 객차가 있나요?'},
  {name:'알록달록 로봇', request:'서로 다른 색 블록 두 개를 붙여 로봇을 만들어 줘!', theme:'color', talk:'어떤 블록이 다른 색 블록의 위나 옆에 있나요?'},
  {name:'토끼 전망대', request:'블록 위에 블록을 하나 더 붙여 전망대를 만들어 줘!', theme:'stack', talk:'토끼가 올라갈 자리는 어느 블록 위인가요?'}
];
let orderIndex = -1;
let orderDeck = [];
let practiceDelivered = false, chestOpened = false;

const glyphs = {
  practice: '<g stroke="#553e4f" stroke-width="2.4" stroke-linejoin="round"><path d="M20 34C12 17 13 5 18 5s10 14 11 25" fill="#fff6de"/><path d="M31 28C30 12 36 3 40 6s2 19-2 27" fill="#fff6de"/><path d="M14 50c-4-18 2-26 16-26s23 13 18 25c-5 12-32 11-34 1Z" fill="#fff6de"/></g><g fill="#493644"><circle cx="24" cy="39" r="2.2"/><circle cx="37" cy="39" r="2.2"/><path d="m28 43 5 0-2.5 3Z"/></g><g fill="#f9ab97"><ellipse cx="20" cy="44" rx="3.6" ry="2"/><ellipse cx="41" cy="44" rx="3.6" ry="2"/></g>',
  carrot:'<g stroke-linecap="round" stroke-linejoin="round"><path d="m42 21 8-13m-7 14 13-6m-15 4 1-12" stroke="#397851" stroke-width="5"/><path d="M42 20c-10-7-27 24-30 34 12-4 42-23 30-34Z" fill="#ff9949" stroke="#a65134" stroke-width="2.5"/><path d="m27 30 5 4m0-12 4 4m-16 15 4 3" stroke="#bb5e35" stroke-width="2.5"/></g>',
  quiz:'<path d="m32 5 8 17 18 3-13 13 3 19-16-9-16 9 3-19L6 25l18-3Z" fill="#ffdc69" stroke="#9e662f" stroke-width="2.8" stroke-linejoin="round"/><circle cx="26" cy="32" r="2" fill="#5b424a"/><circle cx="38" cy="32" r="2" fill="#5b424a"/><path d="M28 38q4 4 8 0" fill="none" stroke="#5b424a" stroke-width="2.5" stroke-linecap="round"/>',
  art:'<g stroke="#58434d" stroke-width="2.3" stroke-linejoin="round"><path d="m10 27 22-18 22 18v27H10Z" fill="#ffc873"/><path d="M6 29 32 7l26 22Z" fill="#df786e"/><path d="m22 29 10-22 10 22" fill="#fff2ce"/><path d="M23 55V33h18v22" fill="#634758"/><path d="m23 33 7 1-7 14Zm18 0-7 1 7 14Z" fill="#e88170"/></g><path d="M32 8V1l12 3-12 4" fill="#7564aa"/>',
  chest:'<g stroke="#674333" stroke-width="2.5" stroke-linejoin="round"><path d="M8 31 5 12l42-5 8 17Z" fill="#f2bd60"/><path d="m12 28-3-12 36-5 5 11Z" fill="#9f6447"/><path d="m7 34 37 4 13-8v20l-13 8-37-5Z" fill="#cc8148"/><path d="m7 34 14-8 36 4-13 8Z" fill="#ffe7a0"/><path d="m26 37 8 1v9l-8-1Z" fill="#ffd674"/></g><path d="m26 2 2 5 5 1-5 2-2 4-1-4-5-2 5-1Z" fill="#fff3af"/>'
};
function festivalIcon(key) {
  const svg = svgNode('svg',{viewBox:'0 0 64 64','aria-hidden':'true',focusable:'false'});
  svg.innerHTML = glyphs[key]; // All drawings are local constants.
  return svg;
}
function mascot(key,x,y,side) {
  const svg = festivalIcon(key);
  for (const [attr,val] of Object.entries({x,y,width:side,height:side,'pointer-events':'none'})) svg.setAttribute(attr,val);
  return svg;
}
function dressVillage() {
  const image = document.querySelector('#village');
  const sky = svgNode('g',{'aria-hidden':'true'});
  sky.innerHTML = '<path d="M46 238Q134 132 232 221T510 192v81H46Z" fill="#7775a7" opacity=".48"/><path d="M367 29a23 23 0 1 0 23 31 22 22 0 0 1-23-31Z" fill="#ffeab7"/><path d="M52 64Q151 99 239 56" stroke="#ded4fb" fill="none" stroke-width="2"/><g fill="#ec9e8c"><path d="m69 71 11 19 6-15Z"/><path d="m161 78 9 15 9-18Z"/></g><g fill="#ffdc78"><path d="m98 78 11 16 7-14Z"/><path d="m194 70 12 14 4-19Z"/></g>';
  for (const [x,y,r] of [[57,113,3],[125,38,4],[271,45,6],[433,101,5],[475,80,3],[401,158,4],[79,183,3],[301,17,2]]) {
    sky.append(svgNode('path',{d:'M'+x+' '+(y-r*1.6)+' q0 '+r*1.6+' '+r+' '+r*1.6+' q-'+r+' 0 -'+r+' '+r*1.6+' q0 -'+r*1.6+' -'+r+' -'+r*1.6+' q'+r+' 0 '+r+' -'+r*1.6,fill:'#ffedb1'}));
  }
  image.prepend(sky);
  image.querySelector('ellipse').setAttribute('fill','#575786');
  image.append(mascot('practice',145,191,64),mascot('quiz',344,199,32));
  document.querySelectorAll('[data-scene]').forEach(span => span.append(festivalIcon(span.dataset.scene)));
}
function renderPassport() {
  const list = document.querySelector('#stamps');
  list.replaceChildren();
  for (const [key,name] of Object.entries(festivalNames)) {
    const item = document.createElement('li');
    item.className = earnedStamps.has(key) ? 'inked' : '';
    item.setAttribute('aria-label',name+' 도장 '+(earnedStamps.has(key) ? '받음' : '아직 없음'));
    item.append(festivalIcon(key),document.createTextNode(name));
    list.append(item);
  }
  document.querySelector('#stamp-count').textContent = earnedStamps.size === 3 ? '도장 3개 완성! 별빛 축제가 열렸어요.' : '모은 도장 '+earnedStamps.size+' / 3';
}
function stairStep() {
  const first = stairs.findIndex(s => state.practice.stacks[s.index].length !== s.height);
  return first < 0 ? stairs.length : first;
}
function drawOrder() {
  if (!orderDeck.length) {
    orderDeck = orders.map((_,i)=>i);
    for (let i=orderDeck.length-1;i>0;i--) {
      const j = Math.floor(Math.random()*(i+1));
      [orderDeck[i],orderDeck[j]]=[orderDeck[j],orderDeck[i]];
    }
    if (orderDeck.at(-1) === orderIndex) [orderDeck[0],orderDeck[orderDeck.length-1]]=[orderDeck.at(-1),orderDeck[0]];
  }
  orderIndex = orderDeck.pop();
  tell('새 주문이 왔어요. 지금 만든 모양을 고쳐도 좋아요.');
  renderMission();
}
function orderFits() {
  if (orderIndex < 0) return false;
  const theme = orders[orderIndex].theme;
  return artBlocks.some((a,i) => artBlocks.slice(i+1).some(b => {
    const relation = neighborLocation(a,b);
    const above = relation==='above' || relation==='below';
    const beside = Boolean(relation) && !above;
    if (theme==='color') return a.color!==b.color && (above||beside);
    return theme==='stack' ? above : beside;
  }));
}
function renderMission() {
  const panel = document.querySelector('.mission');
  panel.dataset.game = active;
  const action = document.querySelector('#mission-action');
  const draw = document.querySelector('#draw-card');
  const title = document.querySelector('#mission-title');
  const body = document.querySelector('#mission-text');
  action.hidden = true; draw.hidden = active!=='art';
  if (active==='practice') {
    const step=stairStep();
    title.textContent = '당근까지 '+step+' / 3칸';
    body.textContent = step===3 ? '계단이 이어졌어요! 토끼에게 당근을 건네주세요.' :
      ['반짝이는 앞줄 왼쪽 끝에 블록 한 개를 놓아 주세요.','한 칸 오른쪽에 두 층을 쌓아 주세요.','다시 한 칸 오른쪽에 세 층을 쌓아 주세요.'][step];
    if (step<3 && state.practice.stacks[stairs[step].index].length>stairs[step].height)
      body.textContent = '표시된 칸이 높아요. ‘빼기’로 '+stairs[step].height+'층을 만들어 주세요.';
    action.hidden = step!==3;
    action.textContent = practiceDelivered ? '계단 다시 만들기' : '당근 건네기';
    if (practiceDelivered && step===3) body.textContent='토끼가 당근을 받았어요! 다른 모양도 자유롭게 쌓아 보세요.';
  } else if (active==='quiz') {
    title.textContent = (questionIndex+1)+'번째 섬 · '+questIslands[questionIndex].name;
    body.textContent = questions[questionIndex].text;
    renderQuest();
  } else {
    const order = orders[orderIndex];
    title.textContent = order ? '손님의 주문 · '+order.name : '첫 손님이 왔어요!';
    body.textContent = order ? order.request : '주문 카드를 뽑아 어떤 장난감을 만들지 알아봐요.';
    draw.textContent = order ? '다른 주문 뽑기' : '주문 뽑기';
    action.hidden = !order;
    action.textContent = '작품 전시하기';
  }
}
function showReward(key) {
  document.querySelector('#reward').classList.toggle('quest-win',key==='quiz');
  document.querySelector('#reward-shop').hidden=key!=='quiz';
  earnedStamps.add(key);
  try { sessionStorage.setItem(stickerKey,JSON.stringify([...earnedStamps])); } catch {}
  renderPassport();
  const art = document.querySelector('#reward-art');
  art.replaceChildren();
  let title, speech;
  if (key==='art') {
    const preview=svgNode('svg',{viewBox:artViewBox(),role:'img','aria-label':'내가 만든 '+orders[orderIndex].name});
    for (const piece of artBoard.children) if (piece.hasAttribute('data-art-id')) preview.append(piece.cloneNode(true));
    art.append(preview);title=orders[orderIndex].name+' 전시회';speech=orders[orderIndex].talk+' 친구에게 소개해 보세요.';
  } else {
    art.append(festivalIcon(key==='practice'?'practice':'chest'));
    title=key==='practice'?'토끼가 당근을 받았어요!':'별빛 보물상자가 열렸어요!';
    speech=key==='practice'?'토끼가 오른 계단을 왼쪽부터 몇 층인지 말해 보세요.':'상자 속에 별빛 도장이 들어 있었어요. 마지막 탑은 어느 쪽에 있었나요?';
  }
  document.querySelector('#reward-title').textContent=title;
  document.querySelector('#reward-text').textContent=speech;
  document.querySelector('#reward').showModal();
}
document.querySelector('#mission-action').addEventListener('click',()=>{
  if (active==='practice' && stairStep()===3) {
    if (practiceDelivered) {
      practiceDelivered=false;
      document.querySelector('#clear').click();
      state.practice.mode='add';updateBoard();
    } else {
      openShapeTalk('practice', () => { practiceDelivered=true;updateBoard();showReward('practice'); });
    }
  }
  if (active==='art' && orderIndex>=0) {
    if (orderFits()) openShapeTalk('art', () => {
      drawArt();showReward('art');
      if (artSpinning) drawBlockBoard();
    });
    else {
      const reminder = '조금 더 만들어 볼까요? '+orders[orderIndex].request;
      document.querySelector('#mission-text').textContent = reminder;
      tell(reminder);
    }
  }
});
document.querySelector('#draw-card').addEventListener('click',drawOrder);
document.querySelector('#reward-home').addEventListener('click',()=>{
  document.querySelector('#reward').close();
  location.hash='home';
});
document.querySelector('#reward-stay').addEventListener('click',()=>document.querySelector('#reward').close());
dressVillage();
renderPassport();
