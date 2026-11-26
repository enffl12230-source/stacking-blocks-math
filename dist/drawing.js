'use strict';
const paints = {
  wood: { name: '나무색', top: '#f3d5aa', left: '#d5a36e', right: '#ba8956', edge: '#986b43' },
  red: { name: '빨간색', top: '#ff9c83', left: '#e77057', right: '#c45242', edge: '#ac4939' },
  yellow: { name: '노란색', top: '#ffe38d', left: '#f4c445', right: '#d89e27', edge: '#af8328' },
  orange: { name:'주황색', top:'#ffc28a', left:'#f7944b', right:'#d67136', edge:'#a34c24' },
  green: { name:'초록색', top:'#a2daa0', left:'#6eb477', right:'#4d935e', edge:'#386c47' },
  sky: { name:'하늘색', top:'#b0e8f7', left:'#7bc6e0', right:'#52a4c2', edge:'#39798f' },
  blue: { name:'파란색', top:'#98bdff', left:'#6393e5', right:'#4875c3', edge:'#31558f' },
  purple: { name:'보라색', top:'#ceb2eb', left:'#a286c9', right:'#8164ae', edge:'#644985' },
  pink: { name:'분홍색', top:'#ffc0d4', left:'#eb95b2', right:'#cb7395', edge:'#9a526f' }
};
function svgNode(name, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}
function cube(x, y, color, w, d, h) {
  const p = paints[color];
  const top = y - h / 2, bottom = top + h;
  const group = svgNode('g', { 'stroke-linejoin': 'round' });
  const face = (points, fill, side) => svgNode('polygon', { points, fill, 'data-art-face':side, stroke: p.edge, 'stroke-width': Math.max(.5, w / 65) });
  group.append(
    face([[x-w,top], [x,top+d], [x,bottom+d], [x-w,bottom]], p.left,'left'),
    face([[x,top+d], [x+w,top], [x+w,bottom], [x,bottom+d]], p.right,'right'),
    face([[x,top-d], [x+w,top], [x,top+d], [x-w,top]], p.top,'top')
  );
  if (color === 'wood') {
    const grain = svgNode('path', {
      d: 'M ' + (x-.75*w) + ' ' + (top+.32*h) + ' q ' + (.14*w) + ' 0 ' + (.32*w) + ' ' + (.22*d) + ' t ' + (.24*w) + ' ' + (.16*d),
      fill:'none', 'pointer-events':'none', stroke:p.edge, opacity:'.48', 'stroke-width': Math.max(.7, w/40), 'stroke-linecap':'round'
    });
    group.append(grain);
  }
  return group;
}
function icon(colors) {
  const graphic = svgNode('svg', { viewBox:'0 0 70 55', 'aria-hidden':'true' });
  if (colors.length === 1) graphic.append(cube(35,27,colors[0],21,10,23));
  else {
    graphic.append(cube(23,30,colors[0],13,6.5,15), cube(49,30,colors[1],13,6.5,15), cube(36,36.5,colors[0],13,6.5,15));
    if (colors[2]) graphic.append(cube(36,21.5,colors[2],13,6.5,15));
  }
  return graphic;
}
function decorateHome() {
  document.querySelector('#logo').append(icon(['wood']));
  const schemes = {practice:['wood','wood','yellow'],quiz:['red','wood'],art:['yellow','wood','red']};
  document.querySelectorAll('[data-icon]').forEach(el => el.append(icon(schemes[el.dataset.icon])));
  const image = document.querySelector('#village');
  image.append(svgNode('ellipse', {cx:278, cy:251, rx:192, ry:38, fill:'#c6d9eb'}));
  const towers = [
    [0,0,['wood','wood','yellow']], [1,0,['wood','red']], [2,0,['wood','wood']], [3,0,['wood','wood','red']],
    [0,1,['wood','wood']], [1,1,['yellow']], [2,1,['yellow']], [3,1,['wood','wood']],
    [0,2,['wood','wood','red']], [1,2,['wood']], [2,2,['yellow']], [3,2,['wood','wood','yellow']],
    [4,3,['wood']], [5,3,['red']], [-1,3,['yellow']]
  ];
  towers.sort((a,b) => a[0]+a[1]-b[0]-b[1]);
  for (const [c,r,stack] of towers) {
    const x = 253+(c-r)*29, base = 175+(c+r)*14;
    stack.forEach((color,k) => image.append(cube(x,base-(k+.5)*32,color,29,14,32)));
  }
}
decorateHome();