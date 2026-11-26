'use strict';
// A block occupies one integer (column, row, layer) cell. Project only for drawing and hit testing.
const artWidth = 35, artDepth = 17.5, artHeight = 39;
const artBoard = document.querySelector('#board');
const artBlocks = [];
let nextArtId = 1;
let drag = null;
let keyboardPoint = { x: 280, y: 210 };

function localPoint(event) {
  const matrix = artBoard.getScreenCTM();
  if (!matrix) return null;
  return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
}
function withinBoard(p) {
  const box=artBoard.viewBox.baseVal;
  return p && p.x>=box.x && p.x<=box.x+box.width && p.y>=box.y && p.y<=box.y+box.height;
}
function artCenter({col,row,level=0}) {
  return {x:280+(col-row)*artWidth, y:210+(col+row)*artDepth-level*artHeight};
}
const artFloor=[];
for (let diagonal=Math.ceil((artWidth-280)/artWidth); diagonal<=(560-artWidth-280)/artWidth;diagonal++) {
  for (let depth=Math.ceil((39-210)/artDepth);depth<=(341-210)/artDepth;depth++) {
    if ((depth+diagonal)%2===0) artFloor.push({col:(depth+diagonal)/2,row:(depth-diagonal)/2});
  }
}
function sameColumn(a,b) { return a.col===b.col && a.row===b.row; }
function artDepthOrder(a,b) { return (a.col+a.row)-(b.col+b.row) || a.level-b.level; }
function artBlockAt(p,pieces=artBlocks) {
  return [...pieces].sort(artDepthOrder).reverse().find(piece=>{
    const center=artCenter(piece), across=Math.abs(p.x-center.x)/artWidth;
    return across<=1 && Math.abs(p.y-center.y)<=artHeight/2+artDepth*(1-across);
  });
}
function withoutMovingBlock(piece) {
  if (!piece) return artBlocks;
  const column=new Set(artBlocks.filter(b=>sameColumn(b,piece)).map(b=>b.level));
  let gap=piece.level+1;
  while(column.has(gap))gap++;
  return artBlocks.filter(b=>b.id!==piece.id).map(b=>
    sameColumn(b,piece) && b.level>piece.level && b.level<gap ? {...b,level:b.level-1} : b);
}
function artFaceAt(p,block) {
  const center=artCenter(block), dx=p.x-center.x;
  const frontTop=center.y-artHeight/2+artDepth*(1-Math.abs(dx)/artWidth);
  return p.y<=frontTop ? 'top' : dx<0 ? 'left' : 'right';
}
function dropLocation(p,pieces=artBlocks,tapped=null,face=null) {
  const hit=tapped || artBlockAt(p,pieces);
  if (hit) {
    const side=face || artFaceAt(p,hit);
    const cell={col:hit.col+Number(side==='right'),row:hit.row+Number(side==='left'),level:hit.level+Number(side==='top'),snapped:true};
    return pieces.some(b=>sameColumn(b,cell) && b.level===cell.level) ? null : cell;
  }
  const heights=new Map();
  const key=(c,r)=>c+','+r;
  for (const b of pieces) heights.set(key(b.col,b.row),Math.max(heights.get(key(b.col,b.row))||0,b.level+1));
  const height=(c,r)=>heights.get(key(c,r))||0;
  let best=null, bestScore=Infinity;
  for (const {col,row} of artFloor) {
    const level=height(col,row), center=artCenter({col,row,level});
    const attached=Boolean(level || height(col-1,row) || height(col+1,row) || height(col,row-1) || height(col,row+1));
    const score=Math.hypot(p.x-center.x,p.y-center.y)+(attached ? 0 : 13);
    if (score<bestScore) { bestScore=score; best={col,row,level,snapped:attached}; }
  }
  return best;
}
function artViewBox() {
  let left=0,right=560,top=0,bottom=380;
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const b of artBlocks){
    const p=artCenter(b);
    minX=Math.min(minX,p.x-artWidth-6);maxX=Math.max(maxX,p.x+artWidth+6);
    minY=Math.min(minY,p.y-artHeight-40);maxY=Math.max(maxY,p.y+40);
  }
  left=Math.min(left,minX);right=Math.max(right,maxX);top=Math.min(top,minY);bottom=Math.max(bottom,maxY);
  const ratio=560/380, scale=artStyle.scale;
  // Leave room for the largest size even when the artwork grows beyond the original board.
  const width=Math.max(right-left,(bottom-top)*ratio,(maxX-minX)*1.3,(maxY-minY)*ratio*1.3)/scale;
  const height=width/ratio;
  const x=Math.min(minX,Math.max(maxX-width,(left+right-width)/2));
  const y=Math.min(minY,Math.max(maxY-height,(top+bottom-height)/2));
  return [x,y,width,height].join(' ');
}
function drawArt(ghost = null) {
  artBoard.setAttribute('viewBox',artViewBox());
  const moving=drag?.picked && drag.moved && ghost;
  const pieces=moving ? withoutMovingBlock(drag.piece) : [...artBlocks];
  if (ghost) pieces.push({...ghost, ghost:true, color:drag ? drag.color : currentState().color});
  pieces.sort(artDepthOrder);
  const fragment = document.createDocumentFragment();
  for (const piece of pieces) {
    const b={...piece,...artCenter(piece)};
    const block = cube(b.x,b.y,b.color,artWidth,artDepth,artHeight);
    if (b.ghost) {
      block.setAttribute('opacity','.58');
      block.setAttribute('pointer-events','none');
      if (b.snapped) block.append(svgNode('polyline', {
        points:[[b.x-10,b.y-21],[b.x-3,b.y-15],[b.x+10,b.y-27]],
        stroke:'#243b51','stroke-width':3,fill:'none','stroke-linecap':'round','stroke-linejoin':'round'
      }));
    } else {
      block.dataset.artId = b.id;
      block.setAttribute('aria-label',paints[b.color].name+' 쌓기나무 '+(b.level+1)+'층');
    }
    fragment.append(block);
  }
  if (ghost) {
    const center=artCenter(ghost);
    const label=boardLabel(center.x,center.y+7,(ghost.level+1)+'층');
    label.setAttribute('class','art-level-label');
    fragment.append(label);
  }
  artBoard.replaceChildren(fragment);
  decorateArtBoard(artBoard);
}
function cancelDrag() {
  if (!drag) return;
  clearTimeout(drag.holdTimer);
  const {capture, pointer} = drag;
  drag = null;
  if (capture.hasPointerCapture(pointer)) capture.releasePointerCapture(pointer);
  if (active === 'art' && !artSpinning) drawArt();
}
function beginDrag(event, sourceColor) {
  if (active !== 'art' || artSpinning || !event.isPrimary || event.button !== 0) return;
  cancelDrag();
  event.preventDefault();
  const p = localPoint(event);
  if (!p) return;
  const piece = sourceColor ? null : artBlocks.find(b => b.id === Number(event.target.closest('[data-art-id]')?.dataset.artId));
  const capture = sourceColor ? event.currentTarget : artBoard;
  if (sourceColor) chooseColor(sourceColor);
  const center=piece ? artCenter(piece) : p;
  drag = {pointer:event.pointerId, capture, piece, face:piece ? event.target.closest('[data-art-face]')?.dataset.artFace : null, color:sourceColor || piece?.color || currentState().color,
    source:!!sourceColor, picked:false, moved:false, startX:event.clientX, startY:event.clientY,
    offsetX:center.x-p.x, offsetY:center.y-p.y};
  if (piece) {
    const press=drag;
    drag.holdTimer=setTimeout(()=>{
      if (drag!==press || drag.moved) return;
      drag.picked=true;
      artBoard.querySelector('[data-art-id="'+piece.id+'"]').classList.add('picked-block');
      tell((piece.level+1)+'층 블록을 잡았어요. 놓을 자리로 끌어 보세요.');
    },400);
  }
  capture.setPointerCapture(event.pointerId);
}
function intendedPoint(p) {
  return {x:p.x+drag.offsetX,y:p.y+drag.offsetY};
}
function moveDrag(event) {
  if (!drag || event.pointerId !== drag.pointer) return;
  if (event.pointerType==='mouse' && event.buttons===0) { cancelDrag();return; }
  const p = localPoint(event);
  if (!p || (!drag.moved && Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<6)) return;
  drag.moved=true;
  clearTimeout(drag.holdTimer);
  if (drag.piece && event.pointerType==='mouse') drag.picked=true;
  if (!drag.source && !drag.picked) return;
  const remaining=withoutMovingBlock(drag.piece);
  drawArt(withinBoard(p) ? dropLocation(intendedPoint(p),remaining) : null);
}
function placeArt(p,color,moving=null,tapped=null,face=null) {
  const pieces=withoutMovingBlock(moving);
  const target=dropLocation(p,pieces,tapped,face);
  if(!target){tell('그 면에는 나무가 붙어 있어요. 보이는 다른 면을 눌러요.');return;}
  if (moving && sameColumn(moving,target) && moving.level===target.level) return;
  saveUndo();
  const piece={id:moving ? moving.id : nextArtId++,color,
    col:target.col,row:target.row,level:target.level};
  if (moving) artBlocks.splice(0,artBlocks.length,...pieces);
  artBlocks.push(piece);
  tell((piece.level+1)+'층에 '+paints[color].name+' 블록을 '+(moving ? '옮겼어요.' : '놓았어요.'));
}
function finishDrag(event) {
  if (!drag || event.pointerId !== drag.pointer) return;
  const p=localPoint(event);
  if (withinBoard(p)) {
    if (drag.picked) {
      const movedAway=Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>=6;
      if (movedAway) placeArt(intendedPoint(p),drag.color,drag.piece);
    } else if (drag.source || !drag.moved) {
      placeArt(p,currentState().color,null,drag.piece,drag.face);
    }
  }
  cancelDrag();
  updateBoard();
}
artBoard.addEventListener('pointerdown', event => beginDrag(event,null));
window.addEventListener('pointermove',moveDrag);
window.addEventListener('pointerup',finishDrag);
window.addEventListener('pointercancel',event => { if (drag?.pointer === event.pointerId) cancelDrag(); });
artBoard.addEventListener('contextmenu',event=>{if (active==='art' && !artSpinning) event.preventDefault();});
window.addEventListener('blur',cancelDrag);
artBoard.addEventListener('keydown', event => {
  if (active !== 'art' || artSpinning || drag) return;
  const movements = { ArrowUp:[0,-20], ArrowDown:[0,20], ArrowLeft:[-20,0], ArrowRight:[20,0] };
  if (movements[event.key]) {
    event.preventDefault();
    const [dx,dy] = movements[event.key];
    const box=artBoard.viewBox.baseVal;
    keyboardPoint = {x:Math.max(box.x+artWidth,Math.min(box.x+box.width-artWidth,keyboardPoint.x+dx)),
      y:Math.max(box.y+32,Math.min(box.y+box.height-32,keyboardPoint.y+dy))};
    drawArt(dropLocation(keyboardPoint));
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    placeArt(keyboardPoint,currentState().color);
    updateBoard();
  }
});
