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
  return artBlocks.filter(b=>b.id!==piece.id).map(b=>
    sameColumn(b,piece) && b.level>piece.level ? {...b,level:b.level-1} : b);
}
function dropLocation(p,pieces=artBlocks,tapped=null) {
  const heights=new Map();
  const key=(c,r)=>c+','+r;
  for (const b of pieces) heights.set(key(b.col,b.row),Math.max(heights.get(key(b.col,b.row))||0,b.level+1));
  const height=(c,r)=>heights.get(key(c,r))||0;
  const hit=tapped || artBlockAt(p,pieces);
  if (hit) {
    const center=artCenter(hit), dx=Math.abs(p.x-center.x), dy=p.y-center.y;
    const topFace=Math.abs(dy+artHeight/2)<=artDepth*(1-dx/artWidth)+1;
    if (tapped || (topFace && dx<artWidth*.75) || (dx<artWidth*.5 && Math.abs(dy)<artHeight*.4)) {
      return {col:hit.col,row:hit.row,level:height(hit.col,hit.row),snapped:true};
    }
  }
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
  let top=0;
  // Leave room to see the next block while the student aims above a tall tower.
  for (const block of artBlocks) top=Math.min(top,artCenter(block).y-artHeight-40);
  const height=380-top,width=height*560/380;
  return [280-width/2,top,width,height].join(' ');
}
function drawArt(ghost = null) {
  artBoard.setAttribute('viewBox',artViewBox());
  const moving=drag?.picked && drag.moved && ghost;
  const pieces=moving ? withoutMovingBlock(drag.piece) : [...artBlocks];
  if (ghost) pieces.push({...ghost, ghost:true, color:drag ? drag.color : currentState().color, stamp:drag?.piece?.stamp});
  pieces.sort(artDepthOrder);
  const fragment = document.createDocumentFragment();
  for (const piece of pieces) {
    const b={...piece,...artCenter(piece)};
    const block = cube(b.x,b.y,b.color,artWidth,artDepth,artHeight);
    if (b.stamp) {
      const points=starOutline.map(([u,v])=>[b.x+u*14,b.y-artHeight/2+v*9]);
      block.append(svgNode('polygon',{points,fill:'#fff2a4',stroke:'#875538','stroke-width':1.4,'pointer-events':'none'}));
    }
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
  if (artTool!=='build' && sourceColor) { chooseColor(sourceColor); return; }
  cancelDrag();
  event.preventDefault();
  const p = localPoint(event);
  if (!p) return;
  const piece = sourceColor ? null : artBlocks.find(b => b.id === Number(event.target.closest('[data-art-id]')?.dataset.artId));
  const capture = sourceColor ? event.currentTarget : artBoard;
  if (sourceColor) chooseColor(sourceColor);
  const center=piece ? artCenter(piece) : p;
  drag = {pointer:event.pointerId, capture, piece, color:sourceColor || piece?.color || currentState().color,
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
  if (drag.piece && artTool==='build' && event.pointerType==='mouse') drag.picked=true;
  if (!drag.source && !drag.picked) return;
  const remaining=withoutMovingBlock(drag.piece);
  drawArt(withinBoard(p) ? dropLocation(intendedPoint(p),remaining) : null);
}
function placeArt(p,color,moving=null,stamp=false,tapped=null) {
  const pieces=withoutMovingBlock(moving);
  const target=dropLocation(p,pieces,tapped);
  if (moving && sameColumn(moving,target) && moving.level===target.level) return;
  saveUndo();
  const piece={id:moving ? moving.id : nextArtId++,color,stamp,
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
      if (movedAway) placeArt(intendedPoint(p),drag.color,drag.piece,drag.piece.stamp);
    } else if (artTool!=='build') {
      if (!drag.moved) applyArtTool(p,drag.piece?.id);
    } else if (drag.source || !drag.moved) {
      placeArt(p,currentState().color,null,false,drag.piece);
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
    keyboardPoint = {x:Math.max(35,Math.min(525,keyboardPoint.x+dx)),y:Math.max(box.y+32,Math.min(341,keyboardPoint.y+dy))};
    if (artTool==='build') drawArt(dropLocation(keyboardPoint));
    else {
      drawArt();
      artBoard.append(svgNode('circle',{cx:keyboardPoint.x,cy:keyboardPoint.y,r:7,fill:'none',stroke:'#25476f','stroke-width':3,'pointer-events':'none'}));
    }
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (artTool==='build') placeArt(keyboardPoint,currentState().color,null,false,artBlockAt(keyboardPoint));
    else {
      const screen=new DOMPoint(keyboardPoint.x,keyboardPoint.y).matrixTransform(artBoard.getScreenCTM());
      const hit=document.elementFromPoint(screen.x,screen.y)?.closest('[data-art-id]');
      applyArtTool(keyboardPoint,Number(hit?.dataset.artId));
    }
    updateBoard();
  }
});
