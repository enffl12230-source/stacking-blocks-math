'use strict';

const locationWords = {right:'오른쪽', left:'왼쪽', front:'앞', back:'뒤', above:'위', below:'아래'};
const oppositeLocation = {right:'left', left:'right', front:'back', back:'front', above:'below', below:'above'};
const talkCube = {width:35, depth:17.5, height:39};
let talkRound = null;

function artPosition(block) {
  // Reverse the board's isometric projection, including the vertical layer.
  const across = block.x / artWidth;
  const along = (block.y + block.level * artHeight) / artDepth;
  return {col:(along+across)/2, row:(along-across)/2, level:block.level, color:block.color};
}
function neighborLocation(reference, target) {
  const offset = [target.col-reference.col, target.row-reference.row, target.level-reference.level];
  const [col,row,level] = offset.map(Math.round);
  const aligned = offset.every((n,i) => Math.abs(n-[col,row,level][i]) < .035);
  if (!aligned || Math.abs(col)+Math.abs(row)+Math.abs(level)!==1) return null;
  if (col) return col>0 ? 'right' : 'left';
  if (row) return row>0 ? 'front' : 'back';
  return level>0 ? 'above' : 'below';
}
function modelForTalk(key) {
  if (key==='art') return artBlocks.map(artPosition);
  return state[key].stacks.flatMap((stack, index) => stack.map((color,level) => ({
    col:index%size, row:Math.floor(index/size), level, color
  })));
}
function visiblePairs(model, key) {
  const pairs=[];
  let preferred=['right','left'];
  if (key==='quiz') preferred=['front','back'];
  if (key==='art' && orders[orderIndex]?.theme==='stack') preferred=['above','below'];
  for (let i=0;i<model.length;i++) {
    for (let j=i+1;j<model.length;j++) {
      const word=neighborLocation(model[i],model[j]);
      if (!word) continue;
      const priority=Number(preferred.includes(word))*4
        + Number(model[i].color!==model[j].color)*2
        + Number(model[i].level>0 || model[j].level>0);
      pairs.push({a:i,b:j,word,priority});
    }
  }
  return pairs.sort((a,b)=>b.priority-a.priority);
}
function describePair() {
  const pair=talkRound.pairs[talkRound.index];
  return talkRound.reverse ? {a:pair.b,b:pair.a,word:oppositeLocation[pair.word]} : pair;
}
function drawTalkPicture() {
  const {model,zoom} = talkRound, {a,b} = describePair();
  const {width,depth,height}=talkCube;
  const blocks=model.map((block,index) => ({
    ...block, index, x:(block.col-block.row)*width, y:(block.col+block.row)*depth-block.level*height
  })).filter(block=>!zoom || block.index===a || block.index===b);
  blocks.sort((first,second)=>first.col+first.row-second.col-second.row || first.level-second.level);
  const picture=document.querySelector('#talk-picture');
  const scene=document.createDocumentFragment();
  let left=Infinity, right=-Infinity, top=Infinity, bottom=-Infinity;
  for (const block of blocks) {
    const node=cube(block.x,block.y,block.color,width,depth,height);
    const marked=block.index===a || block.index===b;
    if (!marked) node.setAttribute('opacity','.54');
    scene.append(node);
    left=Math.min(left,block.x-width);right=Math.max(right,block.x+width);
    top=Math.min(top,block.y-depth-height/2);bottom=Math.max(bottom,block.y+depth+height/2);
  }
  for (const [index,letter,fill] of [[a,'가','#214765'],[b,'나','#873b4a']]) {
    const block=blocks.find(item=>item.index===index);
    const offset = index===a ? -6 : 6;
    const x=block.x+offset, y=block.y+4;
    scene.append(svgNode('circle',{cx:x,cy:y,r:11.5,fill,stroke:'white','stroke-width':1.5}));
    const label=svgNode('text',{x,y:y+1,'text-anchor':'middle','dominant-baseline':'middle',fill:'white','font-size':14,'font-weight':800});
    label.textContent=letter;scene.append(label);
  }
  picture.setAttribute('viewBox',[left-12,top-12,right-left+24,bottom-top+24].join(' '));
  const colors=[a,b].map(i=>paints[model[i].color].name);
  picture.setAttribute('aria-label','가 블록은 '+colors[0]+', 나 블록은 '+colors[1]+'이에요. 전체 모양에는 블록이 '+model.length+'개 있어요.');
  picture.replaceChildren(scene);
  document.querySelector('#talk-zoom').textContent=zoom ? '전체 모양 보기' : '두 블록만 보기';
  document.querySelector('#talk-zoom').setAttribute('aria-pressed',String(zoom));
}
function resetTalkAnswer() {
  talkRound.correct=false;
  document.querySelector('#talk-slot').textContent='___';
  document.querySelector('#talk-done').disabled=true;
  document.querySelector('#talk-feedback').textContent='내가 말한 위치에 맞는 낱말을 골라요.';
  for (const button of document.querySelector('#talk-words').children) button.setAttribute('aria-pressed','false');
  drawTalkPicture();
}
function openShapeTalk(key, finish=null) {
  const model=modelForTalk(key);
  const pairs=visiblePairs(model,key);
  if (!pairs.length) {
    const hint='바로 위나 옆에 블록 두 개를 붙여 보세요. 두 블록이 어디에 있는지 함께 설명할 수 있어요.';
    tell(hint);document.querySelector('#reflect').textContent=hint;return;
  }
  talkRound={model,pairs,index:0,reverse:false,zoom:false,correct:false,finish};
  document.querySelector('#talk-pair').hidden=pairs.length===1;
  resetTalkAnswer();
  document.querySelector('#talk').showModal();
}
function chooseLocation(word) {
  if (!talkRound) return;
  const correctWord=describePair().word;
  talkRound.correct=word===correctWord;
  document.querySelector('#talk-slot').textContent=talkRound.correct ? locationWords[word] : '___';
  const note=document.querySelector('#talk-feedback');
  if (talkRound.correct) {
    note.textContent='그림과 맞아요! 친구가 따라 쌓도록 말해 보세요. 어디에 몇 개를 쌓았나요? 그 옆이나 뒤에는 무엇이 있나요?';
  } else if (correctWord==='above' || correctWord==='below') {
    note.textContent='가 블록을 먼저 짚어요. 나 블록은 가보다 높은 층인가요, 낮은 층인가요?';
  } else {
    note.textContent='두 블록은 같은 층이에요. 가에서 나로 손가락을 옮겨 보고, 판의 앞쪽과 오른쪽 표시를 살펴봐요.';
  }
  for (const button of document.querySelector('#talk-words').children) button.setAttribute('aria-pressed',String(button.dataset.word===word));
  document.querySelector('#talk-done').disabled=!talkRound.correct;
}
for (const [key,word] of Object.entries(locationWords)) {
  const button=document.createElement('button');
  button.type='button';button.dataset.word=key;button.textContent=word;
  button.addEventListener('click',()=>chooseLocation(key));
  document.querySelector('#talk-words').append(button);
}
document.querySelector('#talk-open').addEventListener('click',()=>openShapeTalk(active));
document.querySelector('#talk-zoom').addEventListener('click',()=>{talkRound.zoom=!talkRound.zoom;drawTalkPicture();});
document.querySelector('#talk-swap').addEventListener('click',()=>{talkRound.reverse=!talkRound.reverse;resetTalkAnswer();});
document.querySelector('#talk-pair').addEventListener('click',()=>{
  talkRound.index=(talkRound.index+1)%talkRound.pairs.length;
  talkRound.reverse=false;resetTalkAnswer();
});
document.querySelector('#talk-back').addEventListener('click',()=>document.querySelector('#talk').close());
document.querySelector('#talk-done').addEventListener('click',()=>{
  if (!talkRound?.correct) return;
  const finish=talkRound.finish;
  document.querySelector('#talk').close();
  if (finish) finish(); else tell('모양을 소개했어요. 블록을 옮겨 다른 모양도 설명해 보세요.');
});
document.querySelector('#talk').addEventListener('close',()=>{if (!document.querySelector('#talk').open) talkRound=null;});
