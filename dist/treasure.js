'use strict';

const questIslands=[
  {name:'솔방울 숲',x:40,y:97},
  {name:'버섯 언덕',x:131,y:78},
  {name:'수정 동굴',x:221,y:104},
  {name:'달빛 등대',x:308,y:79},
  {name:'별의 성',x:402,y:97}
];
const chestPoint={x:432,y:92};
let questStarted=false, questHintCell=null, questSound=false, questAudio=null, lastMapState='';
let starFlight=null;

// The small canvas is the map's native pixel resolution. The HTML controls scale independently.
function drawQuestMap(){
  const ctx=document.querySelector('#quest-map').getContext('2d');
  const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  function shape(color,points){
    ctx.fillStyle=color;ctx.beginPath();
    points.forEach(([x,y],i)=>i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    ctx.closePath();ctx.fill();
  }
  function pine(x,y,s){
    rect(x-s,y-3*s,2*s,5*s,'#52394c');
    for(const [w,h] of [[7,5],[5,9],[3,12]]){
      rect(x-w*s,y-h*s,2*w*s,4*s,'#183e53');
      rect(x-(w-1)*s,y-(h+1)*s,(w+1)*s,3*s,'#308176');
      rect(x-(w-1)*s,y-(h+1)*s,w*s,s,'#77bd88');
    }
  }
  function mushroom(x,y,s){
    rect(x-s,y-5*s,2*s,6*s,'#e7b58f');rect(x-5*s,y-6*s,10*s,2*s,'#843d55');
    rect(x-4*s,y-8*s,8*s,3*s,'#e66e71');rect(x-2*s,y-9*s,4*s,2*s,'#ffad86');
    rect(x-3*s,y-7*s,2*s,s,'#ffe4ae');rect(x+2*s,y-8*s,s,s,'#ffe4ae');
  }
  function crystal(x,y,s,color){
    shape('#30415e',[[x-4*s,y],[x-5*s,y-7*s],[x,y-14*s],[x+4*s,y-8*s],[x+3*s,y]]);
    shape(color,[[x-3*s,y-s],[x-4*s,y-7*s],[x,y-12*s],[x,y-s]]);
    shape('#7d8ed9',[[x,y-s],[x,y-12*s],[x+3*s,y-7*s],[x+2*s,y-s]]);
  }
  rect(0,0,460,142,'#192847');rect(0,20,460,18,'#26395a');rect(0,38,460,22,'#3d5272');
  for(let i=0;i<46;i++){
    const x=(i*107+17)%460,y=(i*i*11+7)%44;
    rect(x,y,i%6===0?2:1,1,i%4===0?'#ffe8ab':'#b7bfdd');
    if(i%11===0){rect(x-1,y,4,1,'#e6ceaa');rect(x+1,y-1,1,3,'#e6ceaa');}
  }
  const moon=['....xxx','..xxxx','..xxx','.xxxx','.xxx','.xxx','.xxxx','..xxxx....x','..xxxxxxxx','....xxxxx'];
  moon.forEach((row,y)=>[...row].forEach((pixel,x)=>{if(pixel==='x')rect(354+x,7+y,1,1,'#ffe4a0');}));
  function ridge(base,amplitude,color,phase){
    const pts=[[0,142],[0,base]];
    for(let x=0;x<=465;x+=4){
      const y=base-Math.round((Math.sin(x/19+phase)+Math.sin(x/47+phase)+2)*amplitude);
      pts.push([x,y],[x+4,y]);
    }
    pts.push([460,142]);shape(color,pts);
  }
  ridge(59,5,'#535779',.5);ridge(66,4,'#414b69',2.6);
  rect(0,59,460,83,'#345e76');rect(0,79,460,63,'#30566e');rect(0,117,460,25,'#294961');
  for(let i=0;i<180;i++){
    const x=(i*83+13)%458,y=60+(i*29+Math.floor(i/4)*17)%81;
    rect(x,y,2+i%6,1,i%3?'#497688':'#689496');
  }
  const reached=questStarted ? questionIndex+Number(solved) : 0;
  for(let i=0;i<questIslands.length-1;i++){
    const a=questIslands[i],b=questIslands[i+1];
    for(let j=1;j<13;j++){
      const k=j/13,x=a.x+(b.x-a.x)*k,y=a.y+(b.y-a.y)*k+Math.sin(k*Math.PI)*8;
      rect(x-2,y+2,6,3,'#244454');
      rect(x-2,y,6,2,i<reached?'#ffcf78':'#9aa49c');
    }
  }
  questIslands.forEach(({x,y},i)=>{
    ctx.save();
    if(questStarted && i>questionIndex) ctx.filter='saturate(.52) brightness(.85)';
    const w=i===4?51:37;
    const rim=[[x-w,y-3],[x-w+5,y-3],[x-w+5,y-8],[x-22,y-8],[x-22,y-12],[x+17,y-12],
      [x+17,y-10],[x+w-7,y-10],[x+w-7,y-6],[x+w,y-6],[x+w,y+4],[x+w-9,y+4],
      [x+w-9,y+8],[x+15,y+8],[x+15,y+11],[x-20,y+11],[x-20,y+8],[x-w+5,y+8],[x-w+5,y+4],[x-w,y+4]];
    shape('#24495d',rim.map(([a,b])=>[a+1,b+9]));shape('#78534f',rim.map(([a,b])=>[a,b+5]));
    shape('#c69465',rim.map(([a,b])=>[a,b+2]));shape('#6ca57f',rim);shape('#94be85',rim.map(([a,b])=>[x+(a-x)*.83,b-1]));
    rect(x-12,y+4,16,2,'#d9c58b');rect(x+12,y-4,8,2,'#76a57c');
    if(i===0){pine(x-18,y-3,2);pine(x-29,y,1);pine(x+16,y-8,1);}
    if(i===1){mushroom(x-17,y-3,2);mushroom(x-29,y,1);mushroom(x+12,y-8,1);}
    if(i===2){
      shape('#45516b',[[x-32,y-2],[x-32,y-10],[x-24,y-10],[x-20,y-20],[x-7,y-20],[x,y-9],[x+4,y-2]]);
      rect(x-23,y-8,9,7,'#253648');crystal(x-8,y-4,1,'#a2e6e2');crystal(x+18,y-5,1.5,'#c1c2ff');
    }
    if(i===3){
      rect(x-24,y-28,12,24,'#ede0b5');rect(x-24,y-20,12,6,'#c86e68');rect(x-24,y-10,12,5,'#c86e68');
      rect(x-26,y-30,16,3,'#41465e');rect(x-24,y-37,12,7,'#ffce74');rect(x-22,y-36,2,5,'#fff2b3');
      shape('#a76566',[[x-27,y-37],[x-18,y-45],[x-9,y-37]]);pine(x+16,y-6,1);
    }
    if(i===4){
      rect(x-24,y-23,25,19,'#877b9a');rect(x-29,y-31,8,27,'#b5acc0');rect(x-2,y-34,9,30,'#b5acc0');
      rect(x-30,y-33,3,4,'#d6c3cc');rect(x-25,y-33,4,4,'#d6c3cc');rect(x-3,y-36,4,4,'#d6c3cc');rect(x+4,y-36,4,4,'#d6c3cc');
      rect(x-15,y-13,6,10,'#4d4c69');rect(x+2,y-48,1,13,'#ecd0a4');rect(x+3,y-48,8,4,'#f6a283');
    }
    rect(x-5,y+3,12,4,'#496d66');rect(x-4,y+2,10,3,i<reached?'#fbd773':'#c7bd96');
    ctx.restore();
    if(i<reached){
      rect(x+14,y-14,2,18,'#67504c');rect(x+16,y-14,10,5,'#ffcf70');
      rect(x+16,y-9,6,2,'#e7ac5b');rect(x+16,y-14,8,1,'#ffedac');
    }
  });
}

function paintSprite(id,rows,colors){
  const canvas=document.querySelector(id),ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  rows.forEach((row,y)=>[...row].forEach((key,x)=>{
    if(colors[key]){ctx.fillStyle=colors[key];ctx.fillRect(x,y,1,1);}
  }));
}
paintSprite('#quest-rabbit',[
  '....kk...kk','...kwwk.kwwk','...kwwk.kwwk','...kwpk.kwpk','...kwpk.kwpk','....kwwkwwk',
  '...kaaaaaaak','..kaaaaaayyaak','.kaaaaaayyyyyaak','.kkkkkkkyyykkkkk','...kwwwwwwwwwk',
  '..kwwwwwwwwwwwk','..kwwwkwwwwkwwk','..kwwwkwwwwkwwk','..kwppwwkkwwppk','...kwwwwwwwwwk',
  '....krrrrrrrk','...kwwwrrkwwk','..kwwaawwrrwwk','..kwkaaaakkwwk','...kkaaakkwwwk',
  '...kwwkkkkwwwk','...kkkk..kkkk'
],{k:'#3c3850',w:'#fff1d2',p:'#ec9c92',a:'#a96d46',y:'#ffe177',r:'#dc715c'});
function paintChest(open){
  const rows=open ? ['..kkkkkkkkkkkk','..kaaaaaaaaayk','..kaakaaaakaak','..kkkkkkkkkkkk','................','....y...y....y','...kkkkkkkkkkkk','..kyyyyyyyyyyyyk'] :
    ['................','................','................','................','....kkkkkkkkkk','...kyaaaaaaaayk','..kykaaaaaaaakyk','..kykaaaaaaaakyk'];
  paintSprite('#quest-chest',[...rows,'..kyyyyyyyyyyyyk','..kkkkkyyykkkkkk','..kykaakykaakayk','..kykaakykaakayk','..kykaaakkaakayk','..kykaaaaaaaakyk','..kyyyyyyyyyyyyk','..kkkkkkkkkkkkkk'],{k:'#47374a',a:'#c7864f',y:'#ffda76'});
}

function renderQuest(){
  const scene=document.querySelector('#workshop');
  scene.dataset.quest=questStarted ? 'play' : 'intro';
  const key=[questStarted,questionIndex,solved,chestOpened].join('/');
  if(key===lastMapState)return;
  lastMapState=key;
  drawQuestMap();paintChest(chestOpened);
  const island=questIslands[questionIndex], rabbit=document.querySelector('#quest-rabbit');
  rabbit.style.left=(island.x/460*100)+'%';rabbit.style.top=(island.y/142*100)+'%';
  const pickup=document.querySelector('#quest-pickup');
  pickup.hidden=!questStarted || !solved || chestOpened;
  pickup.style.left=((island.x+10)/460*100)+'%';pickup.style.top=((island.y-19)/142*100)+'%';
  document.querySelector('#quest-count').textContent=(questionIndex+Number(solved))+' / '+questIslands.length;
}
function flyQuestStar(){
  questChime('collect');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const star=document.querySelector('#quest-flying-star'), field=star.parentElement.getBoundingClientRect();
  const from=questIslands[questionIndex];
  const x=(from.x+10)*field.width/460,y=(from.y-19)*field.height/142;
  const toX=chestPoint.x*field.width/460,toY=(chestPoint.y-6)*field.height/142;
  if(starFlight)starFlight.cancel();
  starFlight=star.animate([
    {transform:'translate('+x+'px,'+y+'px) scale(.65)',opacity:1},
    {transform:'translate('+((x+toX)/2)+'px,'+(Math.min(y,toY)*.32)+'px) scale(1.1)',opacity:1,offset:.52},
    {transform:'translate('+toX+'px,'+toY+'px) scale(.2)',opacity:0}
  ],{duration:760,easing:'ease-in-out'});
}
function focusQuestMap(){
  const clue=document.querySelector('#mission-title');
  clue.focus({preventScroll:true});
  if(document.querySelector('#quest-game').getBoundingClientRect().top<0) document.querySelector('#quest-game').scrollIntoView({block:'start'});
}
function questChime(kind){
  if(!questSound || !questAudio || questAudio.state!=='running')return;
  const notes={start:[392,523],found:[523,659,784],collect:[784,988],win:[523,659,784,1047]}[kind];
  notes.forEach((hz,i)=>{
    const tone=questAudio.createOscillator(),volume=questAudio.createGain(),t=questAudio.currentTime+i*.095;
    tone.type='triangle';tone.frequency.value=hz;
    volume.gain.setValueAtTime(.001,t);volume.gain.exponentialRampToValueAtTime(.075,t+.015);volume.gain.exponentialRampToValueAtTime(.001,t+.17);
    tone.connect(volume);volume.connect(questAudio.destination);tone.start(t);tone.stop(t+.18);
    tone.onended=()=>{tone.disconnect();volume.disconnect();};
  });
}
const soundSwitch=document.querySelector('#quest-sound');
function renderSound(){
  soundSwitch.setAttribute('aria-pressed',String(questSound));soundSwitch.textContent=questSound?'효과음 끄기':'효과음 켜기';
}
renderSound();
soundSwitch.hidden=!(window.AudioContext || window.webkitAudioContext);
soundSwitch.addEventListener('click',async()=>{
  questSound=!questSound;renderSound();
  if(!questSound)return;
  try{
    questAudio??=new (window.AudioContext || window.webkitAudioContext)();
    await questAudio.resume();questChime('start');
  }catch{questSound=false;renderSound();soundSwitch.hidden=true;}
});
document.querySelector('#quest-start').addEventListener('click',()=>{
  if(active!=='quiz' || questStarted)return;
  questStarted=true;questChime('start');renderQuest();focusQuestMap();
});
document.querySelector('#quest-pickup').addEventListener('click',()=>document.querySelector('#next').click());
