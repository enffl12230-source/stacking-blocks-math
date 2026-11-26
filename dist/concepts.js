'use strict';

const conceptTopics = {
  cube:{
    title:'쌓기나무는 어떤 모양일까요?',
    text:'쌓기나무 한 개에는 똑같은 정사각형 모양의 면이 여섯 개 있어요. 보는 곳을 바꿔서 면을 살펴봐요.',
    choices:[['home','비스듬히 보기'],['top','위에서 보기'],['right','오른쪽에서 보기']]
  },
  layers:{
    title:'몇 층이고, 모두 몇 개일까요?',
    text:'바닥에 놓인 블록은 1층이에요. 그 위에 한 개를 더 쌓으면 2층이에요. 가장 높은 탑의 층수와 전체 블록의 개수를 따로 세어 봐요.',
    choices:[['one','나란히 놓기'],['two','한 개 올리기'],['three','두 개 올리기']]
  },
  position:{
    title:'가 블록을 기준으로 나 블록은 어디에 있을까요?',
    text:'나무색 가 블록을 먼저 짚어요. 빨간색 나 블록을 옮기며 가를 기준으로 어디에 있는지 말해 봐요.',
    choices:[['above','위'],['below','아래'],['left','왼쪽'],['right','오른쪽'],['front','앞'],['back','뒤']]
  }
};
const conceptOffsets={above:[0,1,0],below:[0,-1,0],left:[-1,0,0],right:[1,0,0],front:[0,0,1],back:[0,0,-1]};
let conceptTopic='cube';
const conceptChoice={cube:'home',layers:'one',position:'above'};

function conceptExample(topic,choice) {
  const blocks=[{pos:[0,0,0],color:'wood'}];
  let preset='home', reading='';
  if (topic==='cube') {
    preset=choice;
    reading=choice==='home' ? '비스듬히 보면 위와 양옆의 세 면이 함께 보여요.' :
      (choice==='top' ? '바로 위' : '바로 오른쪽')+'에서 보면 정사각형 한 면이 보여요.';
  } else if (topic==='layers') {
    const height={one:1,two:2,three:3}[choice];
    blocks.push({pos:[1,0,0],color:'wood'});
    for (let y=1;y<height;y++) blocks.push({pos:[1,y,0],color:y===1?'red':'yellow'});
    reading='가장 높은 곳은 '+height+'층이에요. 바닥의 두 개까지 세면 블록은 모두 '+blocks.length+'개예요.';
  } else {
    blocks[0].label='가';
    blocks.push({pos:conceptOffsets[choice],color:'red',label:'나'});
    reading='나 블록은 가 블록 바로 '+locationWords[choice]+'에 있어요.';
  }
  return {blocks,preset,reading};
}
function drawConceptPicture({blocks,preset,reading}) {
  const picture=document.querySelector('#concept-picture');
  const center=[0,1,2].map(i=>{
    const values=blocks.map(b=>b.pos[i]);
    return (Math.max(...values)+Math.min(...values)+1)/2;
  });
  const scale=blocks.length===1 ? 98 : blocks.length===2 ? 76 : 55;
  const view=sceneProjection(cameraPresets[preset],center,scale,180,127);
  const ordered=[...blocks].sort((a,b)=>view.depth(...a.pos)-view.depth(...b.pos));
  const scene=document.createDocumentFragment();
  for (const block of ordered) {
    scene.append(projectBlock(...block.pos,block.color,view,svgNode('g')));
  }
  for (const b of blocks.filter(b=>b.label)) {
    const [col,level,row]=b.pos;
    const flat=blocks.every(block=>block.pos[1]===level);
    const [x,y]=view.point(col+.5,level+(flat ? 1 : .5),row+.5);
    scene.append(svgNode('circle',{cx:x,cy:y,r:13,fill:b.label==='가'?'#214765':'#873b4a',stroke:'white','stroke-width':1.5}));
    const tag=svgNode('text',{x,y:y+5,fill:'white','font-size':15,'font-weight':800,'text-anchor':'middle'});
    tag.textContent=b.label;scene.append(tag);
  }
  if (conceptTopic==='position') scene.append(boardLabel(180,248,'↙ 내 앞쪽　　 ↘ 내 오른쪽'));
  picture.replaceChildren(scene);
  picture.setAttribute('aria-label',reading);
}
function renderConcept() {
  const topic=conceptTopics[conceptTopic], choice=conceptChoice[conceptTopic];
  document.querySelector('#concept-heading').textContent=topic.title;
  document.querySelector('#concept-explanation').textContent=topic.text;
  for (const button of document.querySelectorAll('[data-topic]')) button.setAttribute('aria-pressed',String(button.dataset.topic===conceptTopic));
  const controls=document.querySelector('#concept-controls');
  if (controls.dataset.topic!==conceptTopic) {
    controls.dataset.topic=conceptTopic;
    controls.replaceChildren(...topic.choices.map(([key,label])=>{
      const button=document.createElement('button');
      button.type='button';button.textContent=label;button.dataset.example=key;
      return button;
    }));
  }
  for (const button of controls.children) button.setAttribute('aria-pressed',String(button.dataset.example===choice));
  const example=conceptExample(conceptTopic,choice);
  drawConceptPicture(example);
  document.querySelector('#concept-reading').textContent=example.reading;
}
document.querySelector('#concept-topics').addEventListener('click',event=>{
  const button=event.target.closest('[data-topic]');
  if (button) {conceptTopic=button.dataset.topic;renderConcept();}
});
document.querySelector('#concept-controls').addEventListener('click',event=>{
  const button=event.target.closest('[data-example]');
  if (button) {conceptChoice[conceptTopic]=button.dataset.example;renderConcept();}
});
