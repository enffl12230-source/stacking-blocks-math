'use strict';
// Centers use the same isometric projection as the rendered faces. Loose blocks
// retain their exact drop coordinates. Only nearby faces create snap targets.
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
  return p && p.x >= 0 && p.x <= 560 && p.y >= 0 && p.y <= 380;
}
function fits(p) {
  return p.x >= artWidth && p.x <= 560-artWidth && p.y >= 39 && p.y <= 341;
}
function distance(a,b) { return Math.hypot(a.x-b.x, a.y-b.y); }

function dropLocation(p, movingId) {
  const blocks = artBlocks.filter(b => b.id !== movingId);
  const targets = [];
  for (const b of blocks) {
    const neighbors = [
      [0,-artHeight,1], [-artWidth,artDepth,0], [artWidth,artDepth,0],
      [-artWidth,-artDepth,0], [artWidth,-artDepth,0]
    ];
    for (const [dx,dy,dz] of neighbors) {
      const point = {x:b.x+dx, y:b.y+dy, level:b.level+dz};
      if (!fits(point) || blocks.some(other => distance(point,other) < 6)) continue;
      // Dropping directly on a block also means "put one on top".
      let score = distance(point,p);
      if (dz && distance(p,b) < 13) score = distance(p,b)*.3;
      if (score <= 42) targets.push({...point, score, snapped:true});
    }
  }
  if (targets.length) return targets.sort((a,b) => a.score-b.score)[0];
  const loose = { x:Math.min(525, Math.max(35,p.x)), y:Math.min(341,Math.max(39,p.y)), level:0, snapped:false };
  return blocks.some(b => distance(b,loose) < 19) ? null : loose;
}
function drawArt(ghost = null) {
  const pieces = artBlocks.filter(b => !(drag && drag.moved && b.id === drag.id && ghost));
  if (ghost) pieces.push({...ghost, ghost:true, color:drag ? drag.color : currentState().color});
  pieces.sort((a,b) => (a.y+a.level*artHeight)-(b.y+b.level*artHeight) || a.level-b.level);
  const fragment = document.createDocumentFragment();
  for (const b of pieces) {
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
      block.setAttribute('aria-label',paints[b.color].name+' 쌓기나무');
    }
    fragment.append(block);
  }
  artBoard.replaceChildren(fragment);
}
function cancelDrag() {
  if (!drag) return;
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
  drag = { pointer:event.pointerId, capture, id:piece?.id, color:sourceColor || piece?.color || currentState().color,
    source:!!sourceColor, moved:false, startX:event.clientX, startY:event.clientY,
    offsetX:piece ? piece.x-p.x : 0, offsetY:piece ? piece.y-p.y : 0 };
  capture.setPointerCapture(event.pointerId);
}
function intendedPoint(p) {
  return {x:p.x+drag.offsetX,y:p.y+drag.offsetY};
}
function moveDrag(event) {
  if (!drag || event.pointerId !== drag.pointer) return;
  const p = localPoint(event);
  if (Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>4) drag.moved = true;
  if (artTool==='build' && drag.moved) drawArt(withinBoard(p) ? dropLocation(intendedPoint(p),drag.id) : null);
}
function placeArt(p, color, movingId, stamp=false) {
  const target = dropLocation(p,movingId);
  if (!target) { tell('빈 곳이나 다른 블록의 가장자리에 놓아 보세요.'); return; }
  saveUndo();
  const existing = artBlocks.find(b => b.id === movingId);
  const piece = existing || {id:nextArtId++, color, stamp};
  Object.assign(piece,{x:target.x,y:target.y,level:target.level});
  if (!existing) artBlocks.push(piece);
  tell(target.snapped ? '가까운 블록에 붙었어요.' : '작업판에 블록을 놓았어요.');
}
function finishDrag(event) {
  if (!drag || event.pointerId !== drag.pointer) return;
  const p = localPoint(event);
  if (withinBoard(p) && artTool!=='build') {
    if (!drag.moved) applyArtTool(p,drag.id);
  } else if (withinBoard(p)) {
    const moving = drag.moved && drag.id;
    const location = moving ? intendedPoint(p) : p;
    placeArt(location,moving ? drag.color : currentState().color,moving || undefined);
  }
  cancelDrag();
  updateBoard();
}
artBoard.addEventListener('pointerdown', event => beginDrag(event,null));
window.addEventListener('pointermove',moveDrag);
window.addEventListener('pointerup',finishDrag);
window.addEventListener('pointercancel',event => { if (drag?.pointer === event.pointerId) cancelDrag(); });
window.addEventListener('blur',cancelDrag);
artBoard.addEventListener('keydown', event => {
  if (active !== 'art' || artSpinning) return;
  const movements = { ArrowUp:[0,-20], ArrowDown:[0,20], ArrowLeft:[-20,0], ArrowRight:[20,0] };
  if (movements[event.key]) {
    event.preventDefault();
    const [dx,dy] = movements[event.key];
    keyboardPoint = {x:Math.max(35,Math.min(525,keyboardPoint.x+dx)),y:Math.max(39,Math.min(341,keyboardPoint.y+dy))};
    if (artTool==='build') drawArt(dropLocation(keyboardPoint));
    else {
      drawArt();
      artBoard.append(svgNode('circle',{cx:keyboardPoint.x,cy:keyboardPoint.y,r:7,fill:'none',stroke:'#25476f','stroke-width':3,'pointer-events':'none'}));
    }
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (artTool==='build') placeArt(keyboardPoint,currentState().color);
    else {
      const screen=new DOMPoint(keyboardPoint.x,keyboardPoint.y).matrixTransform(artBoard.getScreenCTM());
      const hit=document.elementFromPoint(screen.x,screen.y)?.closest('[data-art-id]');
      applyArtTool(keyboardPoint,Number(hit?.dataset.artId));
    }
    updateBoard();
  }
});
