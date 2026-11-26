'use strict';

const conceptTopics = {
  cube:{
    title:'위에서 보면 어떤 모양일까요?',
    text:'쌓기나무는 주사위처럼 생겼어요. 버튼을 눌러 위와 옆에서 살펴봐요.',
    choices:[['home','위와 옆 보기'],['top','위에서 보기'],['right','오른쪽에서 보기']]
  },
  layers:{
    title:'몇 층인가요? 모두 몇 개인가요?',
    text:'바닥에 놓은 나무는 1층이에요. 오른쪽 나무 위에 한 개씩 더 쌓아 봐요.',
    choices:[['add','한 개 더 쌓기'],['remove','한 개 빼기']]
  },
  position:{
    title:'‘나’는 ‘가’의 어디에 있나요?',
    text:'빨간 ‘나’를 끌어 점에 놓아요. ‘가’의 어느 쪽에 놓았는지 말하고, 알맞은 낱말을 눌러요.',
    choices:[['above','위'],['below','아래'],['left','왼쪽'],['right','오른쪽'],['front','앞'],['back','뒤']]
  }
};
const conceptOffsets={above:[0,1,0],below:[0,-1,0],left:[-1,0,0],right:[1,0,0],front:[0,0,1],back:[0,0,-1]};
let conceptTopic='cube';
const conceptChoice={cube:'home',position:'above'};
let layerCount=1, positionAnswer=null;
const conceptPicture=document.querySelector('#concept-picture');
const positionView=sceneProjection(cameraPresets.home,[.5,.5,.5],76,180,126);
const slots=Object.entries(conceptOffsets).map(([key,offset])=>{
  const [x,y]=positionView.point(...offset.map(n=>n+.5));
  return {key,x,y,guideX:180+(x-180)*1.46,guideY:126+(y-126)*1.46};
});
let conceptDrag=null;

function conceptExample(topic,choice) {
  const blocks=[{pos:[0,0,0],color:'wood'}];
  let preset='home', reading='';
  if (topic==='cube') {
    preset=choice;
    reading=choice==='home' ? '위와 옆이 함께 보여요. 보이는 곳을 하나씩 짚어 봐요.' :
      (choice==='top' ? '바로 위' : '바로 오른쪽')+'에서 보면 네모 하나가 보여요.';
  } else if (topic==='layers') {
    const height=layerCount;
    blocks.push({pos:[1,0,0],color:'wood'});
    for (let y=1;y<height;y++) blocks.push({pos:[1,y,0],color:y===1?'red':'yellow'});
    reading='왼쪽에는 한 개가 있어요. 오른쪽은 '+height+'층이에요.';
  } else {
    blocks[0].label='가';
    blocks.push({pos:conceptOffsets[choice],color:'red',label:'나'});
    if (!positionAnswer) reading='‘가’를 먼저 짚어요. ‘나’는 어느 쪽에 있나요?';
    else if (positionAnswer===choice) reading='맞아요! ‘나’는 ‘가’ 바로 '+locationWords[choice]+'에 있어요.';
    else reading='한 번 더 봐요. ‘가’에서 ‘나’로 손가락을 옮겨 보세요.';
  }
  return {blocks,preset,reading};
}
function drawConceptPicture({blocks,preset,reading}) {
  const picture=conceptPicture;
  const position=conceptTopic==='position';
  let view=positionView;
  if (conceptTopic==='cube') view=sceneProjection(cameraPresets[preset],[.5,.5,.5],98,180,127);
  if (conceptTopic==='layers') view=sceneProjection(cameraPresets.home,[1,1.4,.5],67,180,140);
  const ordered=[...blocks].sort((a,b)=>view.depth(...a.pos)-view.depth(...b.pos));
  const scene=document.createDocumentFragment();
  if (position) {
    for (const {key,guideX:x,guideY:y} of slots) {
      const guide=svgNode('g',{'data-slot':key});
      guide.append(svgNode('circle',{cx:x,cy:y,r:22,fill:'transparent'}));
      guide.append(svgNode('circle',{cx:x,cy:y,r:13,class:'slot-ring'}));
      guide.append(svgNode('circle',{cx:x,cy:y,r:3,fill:'#52756b'}));
      scene.append(guide);
    }
  }
  for (const block of ordered) {
    const group=projectBlock(...block.pos,block.color,view,svgNode('g'));
    if (position) group.dataset.piece=block.color;
    scene.append(group);
  }
  for (const b of blocks.filter(b=>b.label)) {
    const [col,level,row]=b.pos;
    const flat=blocks.every(block=>block.pos[1]===level);
    const [x,y]=view.point(col+.5,level+(flat ? 1 : .5),row+.5);
    const badge=svgNode('g',{'data-piece':b.color});
    badge.append(svgNode('circle',{cx:x,cy:y,r:15,fill:b.label==='가'?'#214765':'#873b4a',stroke:'white','stroke-width':1.5}));
    const tag=svgNode('text',{x,y:y+5,fill:'white','font-size':15,'font-weight':800,'text-anchor':'middle'});
    tag.textContent=b.label;badge.append(tag);scene.append(badge);
  }
  if (conceptTopic==='position') scene.append(boardLabel(180,248,'↙ 내 앞쪽　　 ↘ 내 오른쪽'));
  picture.replaceChildren(scene);
  picture.dataset.topic=conceptTopic;
  picture.setAttribute('aria-label',position ? '빨간 ‘나’는 나무색 ‘가’의 '+locationWords[conceptChoice.position]+'에 있어요.' : reading);
}
function renderConcept() {
  const topic=conceptTopics[conceptTopic], choice=conceptChoice[conceptTopic];
  document.querySelector('#concept-heading').textContent=topic.title;
  document.querySelector('#concept-explanation').textContent=topic.text;
  for (const button of document.querySelectorAll('[data-topic]')) button.setAttribute('aria-pressed',String(button.dataset.topic===conceptTopic));
  const nextTopic=document.querySelector('#concept-topics [aria-pressed="true"]').nextElementSibling;
  const next=document.querySelector('#concept-next');
  next.hidden=!nextTopic;
  if (nextTopic) next.textContent='다음 개념 · '+nextTopic.textContent;
  const returnLink=document.querySelector('#concept-return');
  returnLink.hidden=Boolean(nextTopic) && returnLink.hash==='#home';
  const controls=document.querySelector('#concept-controls');
  if (controls.dataset.topic!==conceptTopic) {
    controls.dataset.topic=conceptTopic;
    controls.replaceChildren(...topic.choices.map(([key,label])=>{
      const button=document.createElement('button');
      button.type='button';button.textContent=label;button.dataset.example=key;
      return button;
    }));
  }
  document.querySelector('#concept-place').hidden=conceptTopic!=='position';
  controls.setAttribute('aria-label',conceptTopic==='position' ? '나가 있는 쪽 고르기' : '그림 바꾸기');
  for (const button of controls.children) {
    const key=button.dataset.example;
    if (conceptTopic==='layers') {
      button.removeAttribute('aria-pressed');
      button.disabled=key==='add' ? layerCount===3 : layerCount===1;
    } else button.setAttribute('aria-pressed',String(key===(conceptTopic==='position' ? positionAnswer : choice)));
  }
  const example=conceptExample(conceptTopic,choice);
  drawConceptPicture(example);
  document.querySelector('#concept-reading').hidden=conceptTopic==='layers';
  document.querySelector('#layer-quiz').hidden=conceptTopic!=='layers';
  document.querySelector('#concept-reading').textContent=example.reading;
}
document.querySelector('#concept-topics').addEventListener('click',event=>{
  const button=event.target.closest('[data-topic]');
  if (button) {endConceptDrag();conceptTopic=button.dataset.topic;renderConcept();}
});
document.querySelector('#concept-next').addEventListener('click',()=>{
  const nextTopic=document.querySelector('#concept-topics [aria-pressed="true"]').nextElementSibling;
  if (nextTopic) { nextTopic.click();nextTopic.focus(); }
});
document.querySelector('#concept-controls').addEventListener('click',event=>{
  const button=event.target.closest('[data-example]');
  if (!button) return;
  endConceptDrag();
  const key=button.dataset.example;
  if (conceptTopic==='cube') conceptChoice.cube=key;
  else if (conceptTopic==='layers') {
    layerCount=Math.max(1,Math.min(3,layerCount+(key==='add' ? 1 : -1)));
    document.querySelector('#layer-quiz').reset();
    document.querySelector('#layer-response').textContent='';
  }
  else positionAnswer=key;
  renderConcept();
});

document.querySelector('#layer-quiz').addEventListener('submit',event=>{
  event.preventDefault();
  const input=document.querySelector('#layer-answer'), answer=input.value.trim();
  const message=document.querySelector('#layer-response');
  const numeric=/^\d+$/.test(answer), correct=numeric && Number(answer)===layerCount+1;
  if (!numeric) message.textContent='센 개수를 숫자로 써 보세요.';
  else if (correct) message.textContent='맞아요! 모두 '+(layerCount+1)+'개예요.';
  else message.textContent='바닥에 있는 나무부터 하나씩 짚어 다시 세어 봐요.';
  if (!correct) {input.focus();input.select();}
});
function placeConceptBlock(key) {
  conceptChoice.position=key;
  positionAnswer=null;
  renderConcept();
}
document.querySelector('#concept-place').addEventListener('click',()=>{
  endConceptDrag();
  const index=slots.findIndex(slot=>slot.key===conceptChoice.position);
  placeConceptBlock(slots[(index+1)%slots.length].key);
});
function conceptPoint(event) {
  const matrix=conceptPicture.getScreenCTM();
  return matrix && new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
}
function endConceptDrag() {
  if (!conceptDrag) return;
  const {id}=conceptDrag;
  conceptDrag=null;
  conceptPicture.classList.remove('dragging');
  if (conceptPicture.hasPointerCapture(id)) conceptPicture.releasePointerCapture(id);
  if (conceptTopic==='position') renderConcept();
}
function moveConceptBlock(event) {
  if (!conceptDrag || event.pointerId!==conceptDrag.id || conceptDrag.slot) return null;
  const point=conceptPoint(event);
  if (!point) return null;
  const dx=point.x-conceptDrag.start.x, dy=point.y-conceptDrag.start.y;
  if (!conceptDrag.ghost && Math.hypot(dx,dy)<4) return null;
  if (!conceptDrag.ghost) {
    const ghost=svgNode('g',{'pointer-events':'none',opacity:.94});
    for (const node of conceptPicture.querySelectorAll('[data-piece="red"]')) {
      ghost.append(node.cloneNode(true));node.setAttribute('opacity','0');
    }
    conceptPicture.append(ghost);conceptDrag.ghost=ghost;
  }
  conceptDrag.ghost.setAttribute('transform','translate('+dx+' '+dy+')');
  const origin=conceptDrag.origin;
  const x=origin.x+dx,y=origin.y+dy;
  let aim=null, best=38;
  if (point.x>=0 && point.x<=360 && point.y>=0 && point.y<=270) {
    for (const slot of slots) {
      const distance=Math.min(Math.hypot(point.x-slot.guideX,point.y-slot.guideY),
        Math.hypot(x-slot.x,y-slot.y),Math.hypot(x-slot.guideX,y-slot.guideY));
      if (distance<best) {best=distance;aim=slot.key;}
    }
  }
  for (const guide of conceptPicture.querySelectorAll('[data-slot]')) guide.classList.toggle('aim',guide.dataset.slot===aim);
  return aim;
}
conceptPicture.addEventListener('pointerdown',event=>{
  if (conceptTopic!=='position' || !event.isPrimary || event.button!==0) return;
  const red=event.target.closest('[data-piece="red"]');
  const slot=event.target.closest('[data-slot]')?.dataset.slot;
  const start=conceptPoint(event);
  if ((!red && !slot) || !start) return;
  event.preventDefault();
  endConceptDrag();
  conceptDrag={id:event.pointerId,start,slot,origin:slots.find(s=>s.key===conceptChoice.position),ghost:null};
  conceptPicture.setPointerCapture(event.pointerId);
  if (red) conceptPicture.classList.add('dragging');
});
conceptPicture.addEventListener('pointermove',moveConceptBlock);
conceptPicture.addEventListener('pointerup',event=>{
  if (!conceptDrag || event.pointerId!==conceptDrag.id) return;
  const point=conceptPoint(event);
  const tapped=point && Math.hypot(point.x-conceptDrag.start.x,point.y-conceptDrag.start.y)<10;
  const key=conceptDrag.slot ? (tapped && conceptDrag.slot) : moveConceptBlock(event);
  endConceptDrag();
  if (key) placeConceptBlock(key);
});
for (const type of ['pointercancel','lostpointercapture']) {
  conceptPicture.addEventListener(type,event=>{if (conceptDrag?.id===event.pointerId) endConceptDrag();});
}
window.addEventListener('blur',endConceptDrag);
