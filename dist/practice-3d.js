'use strict';

// x points right, y points up, and z points toward the student's front row.
const cameraPresets = {
  home: {yaw:Math.PI/4, pitch:Math.PI/6, label:'기본 보기'},
  top: {yaw:0, pitch:Math.PI/2, label:'위에서 본 모양'},
  bottom: {yaw:0, pitch:-Math.PI/2, label:'아래에서 본 모양'},
  left: {yaw:-Math.PI/2, pitch:0, label:'왼쪽에서 본 모양'},
  right: {yaw:Math.PI/2, pitch:0, label:'오른쪽에서 본 모양'}
};
const boardCameras = Object.fromEntries(['practice','quiz','art'].map(key=>[key,{...cameraPresets.home,preset:'home'}]));
let camera = boardCameras.practice;
let artSpinning = false;
const cubeFaces = [
  {name:'top',normal:[0,1,0],corners:[4,5,7,6],paint:'top'},
  {name:'bottom',normal:[0,-1,0],corners:[0,2,3,1],paint:'edge'},
  {name:'front',normal:[0,0,1],corners:[2,6,7,3],paint:'left'},
  {name:'back',normal:[0,0,-1],corners:[0,1,5,4],paint:'right'},
  {name:'left',normal:[-1,0,0],corners:[0,4,6,2],paint:'left'},
  {name:'right',normal:[1,0,0],corners:[1,3,7,5],paint:'right'}
];
let orbit = null;
let lastStepView = null;
function sceneProjection({yaw,pitch},center,scale,screenX,screenY) {
  const sy=Math.sin(yaw), cy=Math.cos(yaw), sp=Math.sin(pitch), cp=Math.cos(pitch);
  const eye=[sy*cp,sp,cy*cp];
  return {
    eye,
    point(x,y,z) {
      x-=center[0]; y-=center[1]; z-=center[2];
      return [screenX+scale*(cy*x-sy*z),screenY+scale*(sp*(sy*x+cy*z)-cp*y)];
    },
    depth(x,y,z) { return x*eye[0]+y*eye[1]+z*eye[2]; }
  };
}
function surface(points, attrs) {
  return svgNode('polygon',{points,'stroke-linejoin':'round',...attrs});
}
function floorCorners(x,z) {
  return [[x,0,z],[x+1,0,z],[x+1,0,z+1],[x,0,z+1]];
}
function occupied(x,y,z) {
  return x>=0 && x<size && z>=0 && z<size && y>=0 && y<currentState().stacks[z*size+x].length;
}
function projectBlock(x,level,z,color,view,group,hidden) {
  const vertices=Array.from({length:8},(_,i)=>view.point(x+(i&1),level+((i>>2)&1),z+((i>>1)&1)));
  for (const face of cubeFaces) {
    const [nx,ny,nz]=face.normal;
    const facing=nx*view.eye[0]+ny*view.eye[1]+nz*view.eye[2];
    if (facing<.00001 || (hidden && hidden(nx,ny,nz))) continue;
    const points=face.corners.map(i=>vertices[i]);
    group.append(surface(points,{fill:paints[color][face.paint],stroke:paints[color].edge,'stroke-width':1.5,'data-face':face.name}));
    if (color==='wood' && Math.abs(ny)!==1 && facing>.25) {
      const [a,b,d]=[points[0],points[1],points[3]];
      const at=(u,v)=>[a[0]+(b[0]-a[0])*u+(d[0]-a[0])*v,a[1]+(b[1]-a[1])*u+(d[1]-a[1])*v];
      group.append(svgNode('path',{d:'M'+at(.23,.33)+' Q'+at(.45,.29)+' '+at(.75,.35),fill:'none',stroke:paints.wood.edge,opacity:'.45','pointer-events':'none'}));
    }
  }
  return group;
}
function drawBlockBoard() {
  artBoard.setAttribute('viewBox','0 0 560 380');
  if (active==='art') { drawArtOrbit(); return; }
  const view=sceneProjection(camera,[0,1.35,0],54,280,190);
  const fragment=document.createDocumentFragment(), blocks=[];
  const practice=active==='practice';
  const path=practice ? rabbitPath() : [];
  const above=view.eye[1]>.04;
  const project=points=>points.map(p=>view.point(...p));
  const boardCorners=[[-2,0,-2],[2,0,-2],[2,0,2],[-2,0,2]];
  if (above) {
    const shadow=boardCorners.map(([x,,z])=>view.point(x+.07,-.16,z+.07));
    fragment.append(surface(shadow,{fill:'#bcc7cc','pointer-events':'none'}));
  }
  for (const [index,stack] of currentState().stacks.entries()) {
    const x=index%size-2,z=Math.floor(index/size)-2;
    const tile=cellGroup(index,!stack.length);
    tile.append(surface(project(floorCorners(x,z)),{fill:above ? ((x+z)%2 ? '#faf9ee' : '#e4eadf') : 'none',
      stroke:above?'#a3b4a8':'#cbd6df','stroke-width':above?1.4:.75,'pointer-events':'all'}));
    fragment.append(tile);
    for (const [level,color] of stack.entries()) {
      blocks.push({depth:view.depth(x+.5,level+.5,z+.5),group:projectBlock(x,level,z,color,view,cellGroup(index,level===stack.length-1),
        (dx,dy,dz)=>occupied(index%size+dx,level+dy,Math.floor(index/size)+dz))});
    }
  }
  for (const block of blocks.sort((a,b)=>a.depth-b.depth)) fragment.append(block.group);
  // Game guides are billboards. Hide them in face views to expose the actual silhouette.
  if (practice && above && camera.preset!=='top') {
    if (!rabbitChecked) {
      const start=path[0], x=start%size-2,z=Math.floor(start/size)-2;
      const rim=floorCorners(x,z).map(([u,,v])=>view.point(u,state.practice.stacks[start].length,v));
      fragment.append(surface(rim,{class:'target-cell'}));
    }
    const hop=rabbitChecked && rabbitRound===2 ? rabbitLeg : 0;
    const at=path[hop], x=at%size-1.5,z=Math.floor(at/size)-1.5;
    const [rabbitX,rabbitY]=view.point(x,state.practice.stacks[at].length,z);
    const rabbit=svgNode('g',{'pointer-events':'none'});
    rabbit.append(mascot('practice',rabbitX-19,rabbitY-39,39)); fragment.append(rabbit);
    if (lastStepView && lastStepView.hop<hop && lastStepView.yaw===camera.yaw && lastStepView.pitch===camera.pitch && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const dx=lastStepView.x-rabbitX, dy=lastStepView.y-rabbitY;
      rabbit.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate('+dx/2+'px,'+(dy/2-16)+'px)'},{transform:'translate(0,0)'}],{duration:360});
    }
    lastStepView={hop,x:rabbitX,y:rabbitY,yaw:camera.yaw,pitch:camera.pitch};
    if (!practiceDelivered) {
      const goal=path.at(-1);
      const [px,py]=view.point(goal%size-1.35,path.length,Math.floor(goal/size)-1.5);
      fragment.append(mascot('carrot',px-12,py-22,27));
    }
  }
  if (!practice && camera.preset==='top') {
    currentState().stacks.forEach((stack,index)=>{
      if (!stack.length) return;
      const [x,y]=view.point(index%size-1.5,stack.length,Math.floor(index/size)-1.5);
      fragment.append(boardLabel(x,y+5,stack.length+'층'));
    });
  }
  if (Math.abs(view.eye[1])>.12) {
    for (const [x,z,name] of [[0,2.48,'내 앞'],[2.58,0,'오른쪽']]) {
      const [px,py]=view.point(x,0,z);
      fragment.append(boardLabel(px,py+5,name));
    }
  }
  artBoard.replaceChildren(fragment);
  updateViewControls();
}
function updateViewControls() {
  const orbiting=active!=='art' || artSpinning;
  for (const id of ['#camera-controls','#camera-name','#camera-reset']) document.querySelector(id).hidden=!orbiting;
  artBoard.parentElement.classList.toggle('practice-stage',orbiting);
  document.querySelector('#art-spin').textContent=artSpinning ? '다시 꾸미기' : '작품 돌리기';
  document.querySelector('#art-spin').setAttribute('aria-pressed',String(artSpinning));
  document.querySelector('#view-toggle').textContent=camera.preset==='top' ? '입체로 보기' : '위에서 보기';
  document.querySelector('#camera-name').textContent=camera.label;
  for (const button of document.querySelectorAll('[data-camera]')) button.setAttribute('aria-pressed',String(button.dataset.camera===camera.preset));
}
function drawArtOrbit() {
  const model=[...artBlocks];
  if (!model.length) {
    artBoard.replaceChildren(boardLabel(280,190,'블록을 놓으면 여기서 돌려 볼 수 있어요.'));
    decorateArtBoard(artBoard);updateViewControls();
    return;
  }
  const coords=model.map(b=>[b.col+.5,b.level+.5,b.row+.5]);
  const min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
  for (const center of coords) center.forEach((n,i)=>{min[i]=Math.min(min[i],n);max[i]=Math.max(max[i],n);});
  const mid=min.map((n,i)=>(n+max[i])/2);
  const radius=Math.hypot(...max.map((n,i)=>n-mid[i]+.5));
  const scale=Math.min(66,170/(radius*1.3))*artStyle.scale;
  const view=sceneProjection(camera,mid,scale,280,190);
  const depth=b=>view.depth(b.col,b.level,b.row);
  model.sort((a,b)=>depth(a)-depth(b));
  artBoard.replaceChildren(...model.map(b=>projectBlock(b.col,b.level,b.row,b.color,view,svgNode('g'),null)));
  decorateArtBoard(artBoard);updateViewControls();
}
function setArtSpinning(value) {
  endOrbit();cancelDrag();
  artSpinning=value;
  if (value) Object.assign(camera,cameraPresets.home,{preset:'home'});
  artBoard.setAttribute('aria-label',value ? '작품 회전판. 방향 버튼으로 보는 위치를 고를 수 있어요.' : '작업판. 방향키로 위치를 고르고 엔터로 나무를 붙여요.');
  updateBoard();
}
document.querySelector('#art-spin').addEventListener('click',()=>setArtSpinning(!artSpinning));
function setBoardCamera(preset) {
  endOrbit();
  Object.assign(camera,cameraPresets[preset],{preset});
  drawBlockBoard();
}
document.querySelectorAll('[data-camera]').forEach(button=>button.addEventListener('click',()=>setBoardCamera(button.dataset.camera)));
document.querySelector('#camera-reset').addEventListener('click',()=>setBoardCamera('home'));
function endOrbit() {
  if (!orbit) return;
  const id=orbit.id;
  orbit=null;
  artBoard.classList.remove('orbiting');
  if (artBoard.hasPointerCapture(id)) artBoard.releasePointerCapture(id);
}
artBoard.addEventListener('pointerdown',event=>{
  if ((active!=='practice' && active!=='quiz' && !(active==='art' && artSpinning)) || !event.isPrimary || event.button!==0) return;
  endOrbit();
  const cell=event.target.closest('[data-cell]');
  orbit={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:camera.yaw,pitch:camera.pitch,
    index:cell ? Number(cell.dataset.cell) : null, moved:false};
  artBoard.setPointerCapture(event.pointerId);
});
function moveOrbit(event) {
  if (!orbit || orbit.id!==event.pointerId) return;
  const dx=event.clientX-orbit.x,dy=event.clientY-orbit.y;
  if (!orbit.moved && Math.hypot(dx,dy)<6) return;
  orbit.moved=true;
  const turn=2*Math.PI/Math.max(240,artBoard.clientWidth);
  camera.yaw=(orbit.yaw-dx*turn)%(2*Math.PI);
  const pitch=orbit.pitch+dy*turn;
  camera.pitch=active==='practice' ? Math.max(-Math.PI/2,Math.min(Math.PI/2,pitch)) : pitch%(2*Math.PI);
  camera.preset='free';camera.label='자유 회전';
  artBoard.classList.add('orbiting');
  drawBlockBoard();
}
artBoard.addEventListener('pointermove',moveOrbit);
artBoard.addEventListener('pointerup',event=>{
  if (!orbit || orbit.id!==event.pointerId) return;
  moveOrbit(event);
  const tapped=orbit.moved ? null : orbit.index;
  endOrbit();
  if (active!=='art' && tapped!==null) changeStack(tapped);
});
for (const name of ['pointercancel','lostpointercapture']) artBoard.addEventListener(name,event=>{
  if (orbit?.id===event.pointerId) endOrbit();
});
window.addEventListener('blur',endOrbit);
