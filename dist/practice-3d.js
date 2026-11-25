'use strict';

// x points right, y points up, and z points toward the student's front row.
const cameraPresets = {
  home: {yaw:Math.PI/4, pitch:Math.PI/6, label:'기본 보기'},
  top: {yaw:0, pitch:Math.PI/2, label:'위에서 본 모양'},
  bottom: {yaw:0, pitch:-Math.PI/2, label:'아래에서 본 모양'},
  left: {yaw:-Math.PI/2, pitch:0, label:'왼쪽에서 본 모양'},
  right: {yaw:Math.PI/2, pitch:0, label:'오른쪽에서 본 모양'}
};
const camera = {...cameraPresets.home, preset:'home'};
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
function practiceProjection() {
  const sy=Math.sin(camera.yaw), cy=Math.cos(camera.yaw);
  const sp=Math.sin(camera.pitch), cp=Math.cos(camera.pitch);
  const eye=[sy*cp, sp, cy*cp];
  return {
    eye,
    point(x,y,z) {
      return [280+54*(cy*x-sy*z),190+54*(sp*(sy*x+cy*z)-cp*(y-1.35))];
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
  return x>=0 && x<size && z>=0 && z<size && y>=0 && y<state.practice.stacks[z*size+x].length;
}
function raisedBlock(index,level,color,view,keyboard) {
  const c=index%size, r=Math.floor(index/size), x=c-size/2, z=r-size/2;
  const vertices=Array.from({length:8},(_,i)=>view.point(x+(i&1),level+((i>>2)&1),z+((i>>1)&1)));
  const group=cellGroup(index,keyboard);
  for (const face of cubeFaces) {
    const [nx,ny,nz]=face.normal;
    const facing=nx*view.eye[0]+ny*view.eye[1]+nz*view.eye[2];
    if (facing<.00001 || occupied(c+nx,level+ny,r+nz)) continue;
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
function drawPractice() {
  const view=practiceProjection();
  const fragment=document.createDocumentFragment(), blocks=[];
  const step=stairStep(), task=stairs[step];
  const above=view.eye[1]>.04;
  const project=points=>points.map(p=>view.point(...p));
  const boardCorners=[[-2,0,-2],[2,0,-2],[2,0,2],[-2,0,2]];
  if (above) {
    const shadow=boardCorners.map(([x,,z])=>view.point(x+.07,-.16,z+.07));
    fragment.append(surface(shadow,{fill:'#bcc7cc','pointer-events':'none'}));
  }
  for (const [index,stack] of state.practice.stacks.entries()) {
    const x=index%size-2,z=Math.floor(index/size)-2;
    const tile=cellGroup(index,!stack.length);
    tile.append(surface(project(floorCorners(x,z)),{fill:above ? ((x+z)%2 ? '#faf9ee' : '#e4eadf') : 'none',
      stroke:above?'#a3b4a8':'#cbd6df','stroke-width':above?1.4:.75,'pointer-events':'all'}));
    fragment.append(tile);
    for (const [level,color] of stack.entries()) {
      blocks.push({depth:view.depth(x+.5,level+.5,z+.5),group:raisedBlock(index,level,color,view,level===stack.length-1)});
    }
  }
  for (const block of blocks.sort((a,b)=>a.depth-b.depth)) fragment.append(block.group);
  // Game guides are billboards. Hide them in face views to expose the actual silhouette.
  if (above && camera.preset!=='top') {
    if (task) {
      const x=task.index%size-2,z=Math.floor(task.index/size)-2,height=state.practice.stacks[task.index].length;
      const rim=floorCorners(x,z).map(([u,,v])=>view.point(u,height,v));
      fragment.append(surface(rim,{class:'target-cell'}));
      const [px,py]=view.point(x+.5,height,z+.5);
      fragment.append(boardLabel(px,py+4,task.height+'층'));
    }
    const previous=stairs[Math.max(0,step-1)];
    const [rabbitX,rabbitY]=step ? view.point(previous.index%size-1.5,previous.height,1.5) : view.point(-2.65,0,1.45);
    const rabbit=svgNode('g',{'pointer-events':'none'});
    rabbit.append(mascot('practice',rabbitX-19,rabbitY-39,39)); fragment.append(rabbit);
    if (lastStepView && lastStepView.step<step && lastStepView.yaw===camera.yaw && lastStepView.pitch===camera.pitch && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const dx=lastStepView.x-rabbitX, dy=lastStepView.y-rabbitY;
      rabbit.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate('+dx/2+'px,'+(dy/2-16)+'px)'},{transform:'translate(0,0)'}],{duration:360});
    }
    lastStepView={step,x:rabbitX,y:rabbitY,yaw:camera.yaw,pitch:camera.pitch};
    if (!practiceDelivered) {
      const [px,py]=view.point(1.08,3,1.4);
      fragment.append(mascot('carrot',px-12,py-22,27));
    }
  }
  if (Math.abs(view.eye[1])>.12) {
    for (const [x,z,name] of [[0,2.48,'내 앞'],[2.58,0,'오른쪽']]) {
      const [px,py]=view.point(x,0,z);
      fragment.append(boardLabel(px,py+5,name));
    }
  }
  artBoard.replaceChildren(fragment);
  document.querySelector('#camera-name').textContent=camera.label;
  for (const button of document.querySelectorAll('[data-camera]')) button.setAttribute('aria-pressed',String(button.dataset.camera===camera.preset));
}
function setPracticeCamera(preset) {
  endOrbit();
  Object.assign(camera,cameraPresets[preset],{preset});
  drawPractice();
}
document.querySelectorAll('[data-camera]').forEach(button=>button.addEventListener('click',()=>setPracticeCamera(button.dataset.camera)));
document.querySelector('#camera-reset').addEventListener('click',()=>setPracticeCamera('home'));
function endOrbit() {
  if (!orbit) return;
  const id=orbit.id;
  orbit=null;
  artBoard.classList.remove('orbiting');
  if (artBoard.hasPointerCapture(id)) artBoard.releasePointerCapture(id);
}
artBoard.addEventListener('pointerdown',event=>{
  if (active!=='practice' || !event.isPrimary || event.button!==0) return;
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
  camera.pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,orbit.pitch+dy*turn));
  camera.preset='free';camera.label='자유 회전';
  artBoard.classList.add('orbiting');
  drawPractice();
}
artBoard.addEventListener('pointermove',moveOrbit);
artBoard.addEventListener('pointerup',event=>{
  if (!orbit || orbit.id!==event.pointerId) return;
  moveOrbit(event);
  const tapped=orbit.moved ? null : orbit.index;
  endOrbit();
  if (tapped!==null) changeStack(tapped);
});
for (const name of ['pointercancel','lostpointercapture']) artBoard.addEventListener(name,event=>{
  if (orbit?.id===event.pointerId) endOrbit();
});
window.addEventListener('blur',endOrbit);
