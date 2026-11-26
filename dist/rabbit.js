'use strict';

const rabbitMoves=[[-1,0,'왼쪽'],[1,0,'오른쪽'],[0,-1,'뒤'],[0,1,'앞']];
const rabbitKinds=['한 곳에 놓기','두 칸 잇기','꺾이는 계단 만들기'];
let rabbitSet=[], rabbitRound=0, rabbitChecked=false, rabbitLeg=0;

function newRabbitSet(){
  const previousKey='block-festival-last-rabbit';
  let previous=rabbitSet.map(path=>path.join(','));
  try {
    const saved=JSON.parse(localStorage.getItem(previousKey));
    if(Array.isArray(saved))previous=saved;
  } catch { /* Keep the current visit’s problems when storage is unavailable. */ }
  const choices=[[],[],[]];
  function neighbor(index,dx,dy){
    const x=index%size+dx,y=Math.floor(index/size)+dy;
    return x>=0 && x<size && y>=0 && y<size ? y*size+x : -1;
  }
  for(let a=0;a<size*size;a++){
    choices[0].push([a]);
    for(const [dx,dy] of rabbitMoves){
      const b=neighbor(a,dx,dy);
      if(b<0)continue;
      choices[1].push([a,b]);
      for(const turn of [-1,1]){
        const c=neighbor(b,dy*turn,dx*turn);
        if(c>=0)choices[2].push([a,b,c]);
      }
    }
  }
  rabbitSet=choices.map((pool,i)=>{
    const fresh=pool.filter(path=>path.join(',')!==previous[i]);
    return fresh[Math.floor(Math.random()*fresh.length)];
  });
  try {localStorage.setItem(previousKey,JSON.stringify(rabbitSet.map(path=>path.join(','))));} catch {}
  rabbitRound=0;practiceDelivered=false;resetRabbitAnswer();
}
function resetRabbitAnswer(){
  rabbitChecked=false;rabbitLeg=0;
  document.querySelector('#rabbit-note').textContent='';
  document.querySelector('#rabbit-feedback').textContent='';
}
function rabbitPath(){return rabbitSet[rabbitRound];}
function hopWord(a,b){
  return rabbitMoves.find(([dx,dy])=>a%size+dx===b%size && Math.floor(a/size)+dy===Math.floor(b/size))[2];
}
function hopPhrase(word){return word+(word==='뒤'?'로':'으로');}
function rabbitClue(){
  const [a,b,c]=rabbitPath();
  let clue=positionName(a)+'에 나무 한 개를 놓아 줘.';
  if(b!==undefined)clue+=' 거기서 '+hopPhrase(hopWord(a,b))+' 한 칸 가서 두 층을 쌓아 줘.';
  if(c!==undefined)clue+=' 두 층에서 '+hopPhrase(hopWord(b,c))+' 한 칸 가서 한 층 더 높은 탑을 만들어 줘.';
  return clue;
}
function rabbitMismatch(){
  const path=rabbitPath();
  return state.practice.stacks.findIndex((tower,i)=>tower.length!==path.indexOf(i)+1);
}
function renderRabbit(title,body,action){
  const guide=document.querySelector('#rabbit-guide');
  const guiding=rabbitChecked && rabbitRound===2 && !practiceDelivered;
  guide.hidden=!guiding;
  title.textContent='토끼 문제 '+(rabbitRound+1)+' / 3 · '+rabbitKinds[rabbitRound];
  body.textContent=practiceDelivered?'토끼가 네 말을 듣고 당근까지 왔어!':rabbitClue();
  action.hidden=guiding && rabbitLeg<2;
  action.textContent=practiceDelivered?'새 문제로 다시 놀기':guiding?'길을 말했어요 · 당근 주기':rabbitChecked?'다음 토끼 문제':'토끼에게 확인받기';
  if(guiding){
    const prompt=rabbitLeg===2 ? '이제 두 번 가는 길을 이어서 소리 내어 알려 줘!' :
      (rabbitLeg+1)+'층에서 '+(rabbitLeg+2)+'층으로 가려면 어느 쪽으로 한 칸 가야 할까?';
    document.querySelector('#rabbit-prompt').textContent=prompt;
    document.querySelector('#rabbit-directions').hidden=rabbitLeg===2;
  }
}
function handleRabbitAction(){
  if(practiceDelivered || (rabbitChecked && rabbitRound<2)){
    if(practiceDelivered)newRabbitSet();else {rabbitRound++;resetRabbitAnswer();}
    Object.assign(state.practice,{stacks:emptyBoard(),history:[],mode:'add'});
    setBoardCamera('home');tell('토끼가 낸 문제를 읽어 봐요.');updateBoard();return;
  }
  if(!rabbitChecked){
    const mismatch=rabbitMismatch();
    if(mismatch!==-1){
      const need=rabbitPath().indexOf(mismatch)+1;
      document.querySelector('#rabbit-feedback').textContent=positionName(mismatch)+(need?'에 '+need+'층이 되도록 쌓아 줘.':'은 비워 줘.');
      return;
    }
    rabbitChecked=true;
    if(rabbitRound===2)setBoardCamera('home');
    document.querySelector('#rabbit-feedback').textContent=rabbitRound===2?'계단 완성! 토끼에게 당근까지 가는 길을 알려 줘.':'맞았어! 다음 문제로 가 볼까?';
    updateBoard();return;
  }
  if(rabbitLeg===2){
    practiceDelivered=true;
    document.querySelector('#rabbit-feedback').textContent='';
    updateBoard();showReward('practice');
  }
}
document.querySelector('#rabbit-directions').addEventListener('click',event=>{
  const button=event.target.closest('[data-hop]');
  if(!button || active!=='practice' || !rabbitChecked || rabbitLeg>=2)return;
  const path=rabbitPath(), expected=hopWord(path[rabbitLeg],path[rabbitLeg+1]);
  const note=document.querySelector('#rabbit-note');
  if(button.dataset.hop!==expected){note.textContent='토끼가 있는 층과 다음 층을 차례로 짚어 봐.';return;}
  rabbitLeg++;
  note.textContent=rabbitLeg===1?'맞았어! 이제 두 번째 길을 찾아 줘.' :
    '“1층에서 '+hopPhrase(hopWord(path[0],path[1]))+' 한 칸, 2층에서 '+hopPhrase(hopWord(path[1],path[2]))+' 한 칸 가!”';
  updateBoard();
});
