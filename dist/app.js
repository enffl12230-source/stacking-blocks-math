'use strict';
const $ = selector => document.querySelector(selector);
const size = 4, maxLayers = 3;
const emptyBoard = () => Array.from({length:size*size}, () => []);
const questions = [
  {text:'맨 앞줄 왼쪽 끝에 한 개를 놓아요. 그 바로 뒤 칸에는 두 개를 쌓아요.', hint:'앞줄 왼쪽 끝에서 시작해요. 두 번째 탑은 그 뒤에 있어요.', answer:[[12,1],[8,2]]},
  {text:'맨 앞줄 오른쪽 끝에 세 개를 쌓아요. 그 바로 뒤 칸에는 한 개를 놓아요.', hint:'앞줄 오른쪽 끝에 가장 높은 탑이 있어요.', answer:[[15,3],[11,1]]},
  {text:'맨 앞줄 왼쪽 끝부터 오른쪽으로 한 개, 두 개, 한 개를 차례로 쌓아요.', hint:'앞줄의 세 칸을 써요. 가운데 탑이 가장 높아요.', answer:[[12,1],[13,2],[14,1]]},
  {text:'맨 뒷줄 오른쪽 끝에 두 개를 쌓아요. 그 바로 왼쪽 칸과 바로 앞 칸에는 한 개씩 놓아요.', hint:'세 탑이 모서리에서 만나도록 만들어요.', answer:[[3,2],[2,1],[7,1]]},
  {text:'맨 앞줄 왼쪽 끝에 한 개를 놓아요. 한 칸 뒤로, 한 칸 오른쪽으로 가서 두 개를 쌓아요. 거기서 다시 한 칸 뒤로, 한 칸 오른쪽으로 가서 세 개를 쌓아요.', hint:'위에서 보면 세 탑이 비스듬히 이어져요.', answer:[[12,1],[9,2],[6,3]]}
];
const lessons = {
  practice:{title:'토끼의 당근 계단', instruction:'격자를 톡 눌러 세 층까지 쌓아요. 판을 꾹 누른 채 끌면 빙글빙글 돌아가요.', reflect:'마지막에는 토끼가 당근을 찾도록 1층부터 가는 길을 말해 줘요.'},
  quiz:{title:'별빛 보물찾기', instruction:'단서대로 쌓고 판을 돌려 살펴봐요. 단서를 처음 맞히면 미술 도구를 살 별빛 크레딧을 받아요.', reflect:'별이 숨은 곳을 찾기 어려우면 ‘토끼 힌트’를 눌러요.'},
  art:{title:'축제 장난감 가게', instruction:'색을 고르고 빈 곳을 톡 눌러요. 윗면을 누르면 위에, 옆면을 누르면 그 옆에 붙어요. 꾹 누른 채 끌면 옮겨요.', reflect:'블록의 위치를 넣어 친구에게 내 장난감을 소개해요.'}
};
const state = Object.fromEntries(Object.keys(lessons).map(key => [key,{
  color:'wood', mode:'add', stacks:emptyBoard(), history:[], message:''
}]));
let active = 'home', questionIndex = 0, solved = false;
function currentState() { return state[active]; }
function tell(message) {
  currentState().message = message;
  $('#feedback').textContent = message;
}
function saveUndo() {
  const s = currentState();
  const items = active === 'art' ? {blocks:artBlocks,style:artStyle} : s.stacks;
  s.history.push(JSON.stringify(items));
  if (s.history.length > 80) s.history.shift();
}
function chooseColor(color) {
  currentState().color = color;
  for (const button of $('#palette').children) button.setAttribute('aria-pressed', button.dataset.color === color);
}
function buildPalette() {
  const tray = $('#palette');
  for (const [color,paint] of Object.entries(paints)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.color = color;
    button.className = 'block-option';
    button.append(icon([color]),document.createTextNode(paint.name));
    button.addEventListener('click',() => chooseColor(color));
    button.addEventListener('pointerdown', event => beginDrag(event,color));
    tray.append(button);
  }
}
function positionName(index) {
  return ['맨 뒷줄','뒤에서 두 번째 줄','앞에서 두 번째 줄','맨 앞줄'][Math.floor(index/size)]+' '+
    ['왼쪽 끝','왼쪽에서 두 번째 칸','오른쪽에서 두 번째 칸','오른쪽 끝'][index%size];
}
function changeStack(index, fromKeyboard = false) {
  if (active==='quiz' && !questStarted) return;
  if (solved && active === 'quiz') { tell('맞았어요! 다음 활동 버튼을 눌러 보세요.'); return; }
  const s = currentState(), stack = s.stacks[index];
  if (s.mode === 'add' && stack.length === maxLayers) { tell('이 칸은 벌써 세 층이에요. 다른 칸에 쌓아 보세요.'); return; }
  if (s.mode === 'remove' && !stack.length) { tell('여기는 빈 칸이에요. 블록이 있는 칸을 눌러 보세요.'); return; }
  if(active==='practice' && !practiceDelivered) resetRabbitAnswer();
  if (active==='quiz') questHintCell=null;
  saveUndo();
  if (s.mode === 'add') stack.push(s.color);
  else stack.pop();
  tell(positionName(index)+'에 남은 블록은 '+stack.length+'개예요.');
  updateBoard();
  if (fromKeyboard) artBoard.querySelector('[data-cell="'+index+'"][tabindex="0"]').focus();
}
function cellGroup(index, keyboard) {
  const group = svgNode('g',{ 'data-cell':index });
  if (active==='quiz' && index===questHintCell) group.classList.add('quest-hint-cell');
  if (keyboard) {
    group.setAttribute('role','button');
    group.setAttribute('tabindex','0');
    group.setAttribute('aria-label',positionName(index)+', '+currentState().stacks[index].length+'층');
  } else group.setAttribute('aria-hidden','true');
  return group;
}
function boardLabel(x,y,value) {
  const text = svgNode('text',{x,y,'text-anchor':'middle','font-size':16});
  text.textContent = value; return text;
}
artBoard.addEventListener('click', event => {
  const cell = event.target.closest('[data-cell]');
  if (cell && active !== 'art' && event.detail === 0) changeStack(Number(cell.dataset.cell));
});
artBoard.addEventListener('keydown', event => {
  const cell = event.target.closest('[data-cell]');
  if (!cell || !['Enter',' '].includes(event.key)) return;
  event.preventDefault();
  changeStack(Number(cell.dataset.cell),true);
});
function updateBoard() {
  const s = currentState(), art = active === 'art';
  $('#reflect').textContent = lessons[active].reflect;
  const count = art ? artBlocks.length : s.stacks.reduce((sum,stack) => sum+stack.length,0);
  if (art && !artSpinning) drawArt();
  else drawBlockBoard();
  let countLabel='블록 '+count+'개';
  if (art && count) countLabel+=' · 가장 높은 탑 '+artBlocks.reduce((h,b)=>Math.max(h,b.level+1),0)+'층';
  $('#count').textContent=countLabel;
  $('#undo').disabled = !s.history.length;
  $('#clear').disabled = count===0 && !(art && (artStyle.bubble || artStyle.background!=='plain' || artStyle.scale!==1));
  $('#orientation').textContent = art ? (artSpinning ? '작품을 끌어 돌려요. 다 보았으면 ‘다시 꾸미기’를 눌러요.' : toolInstruction()) :
    (active==='quiz' ? '칸을 톡 누르면 쌓이고, 판을 끌면 돌아가요. ‘내 앞’이 맨 앞줄이에요.' : '끌어서 돌리거나 네 방향 버튼을 눌러요.');
  updateViewControls();
  for (const button of $('#modes').children) button.setAttribute('aria-pressed',button.dataset.mode === s.mode);
  renderMission();
}
function showQuestion() {
  $('#next').hidden = !solved;
  $('#check').hidden = solved;
  $('#hint').hidden = solved;
  const final = questionIndex === questions.length-1;
  $('#next').textContent = final ? (chestOpened ? '다시 탐험하기' : '별 담고 상자 열기') : '별 담고 다음 섬으로';
  renderMission();
}
function reopenQuestion() {
  if(active==='practice' && !practiceDelivered)resetRabbitAnswer();
  if (active !== 'quiz') return;
  solved = false; questHintCell=null; chestOpened=false;showQuestion();
}
function clueHeights() {
  const target=Array(size*size).fill(0);
  for (const [index,height] of questions[questionIndex].answer) target[index]=height;
  return target;
}
$('#check').addEventListener('click',() => {
  if (active!=='quiz' || !questStarted || solved) return;
  const target=clueHeights();
  const mismatched = state.quiz.stacks.findIndex((stack,i) => stack.length !== target[i]);
  solved = mismatched < 0;
  if (solved) {
    const earned = claimClue(questionIndex);
    const prize = earned ? '별빛 크레딧 1개를 받았어요! ' : '이미 별빛 크레딧을 받은 단서예요. ';
    questHintCell=null;
    tell(prize+'별을 눌러 보물상자에 담아 주세요.');
    questChime('found');
  } else {
    questHintCell=mismatched;
    const tooTall = state.quiz.stacks[mismatched].length > target[mismatched];
    tell(positionName(mismatched)+'에서 블록을 '+(tooTall ? '조금 빼 보세요.' : '조금 더 쌓아 보세요.'));
  }
  revealQuizCell();showQuestion();
  if (solved) $('#next').focus({preventScroll:true});
});
function revealQuizCell() {
  // An empty floor cell is edge-on in a side view. Show the marked tile from above.
  if (questHintCell!==null && questHintCell>=0 && Math.sin(camera.pitch)<.3) setBoardCamera('top');
  else drawBlockBoard();
}
$('#hint').addEventListener('click', () => {
  if (active!=='quiz' || solved || !questStarted) return;
  const target=clueHeights();
  questHintCell=state.quiz.stacks.findIndex((stack,i)=>stack.length!==target[i]);
  tell(questHintCell<0 ? '단서와 꼭 맞아요. 별 찾기를 눌러요!' : questions[questionIndex].hint+' 테두리가 빛나는 칸을 살펴봐요.');
  revealQuizCell();
});
$('#next').addEventListener('click', () => {
  if (!solved || active!=='quiz' || !questStarted) return;
  if (!chestOpened) flyQuestStar();
  if (questionIndex === questions.length-1 && !chestOpened) {
    openShapeTalk('quiz', () => { chestOpened=true;questChime('win');showQuestion();showReward('quiz'); });
    return;
  }
  questionIndex = (questionIndex+1)%questions.length;
  chestOpened = false;questHintCell=null;
  Object.assign(state.quiz,{stacks:emptyBoard(),history:[],mode:'add'});
  solved = false;showQuestion();tell('토끼와 함께 새 단서를 읽어 봐요.');updateBoard();
  focusQuestMap();
});
$('#modes').addEventListener('click',event => {
  if (!event.target.dataset.mode) return;
  currentState().mode = event.target.dataset.mode;
  tell(currentState().mode === 'add' ? '칸을 누르면 한 개씩 쌓여요.' : '칸을 누르면 맨 위 블록이 빠져요.');
  updateBoard();
});
$('#view-toggle').addEventListener('click',() => setBoardCamera(camera.preset==='top' ? 'home' : 'top'));
$('#clear').addEventListener('click',() => {
  if (active==='art') cancelDrag();
  saveUndo();
  if (active === 'art') {artBlocks.length=0;artStyle={...defaultArtStyle};refreshShop();}
  else currentState().stacks = emptyBoard();
  reopenQuestion(); tell('모두 비웠어요. 되돌리면 다시 볼 수 있어요.'); updateBoard();
});
$('#undo').addEventListener('click',() => {
  const s = currentState();
  if (!s.history.length) return;
  if (active==='art') cancelDrag();
  const previous = JSON.parse(s.history.pop());
  if (active === 'art') {
    artBlocks.splice(0,artBlocks.length,...(previous.blocks || previous));
    artStyle={...defaultArtStyle,...previous.style};refreshShop();
  }
  else s.stacks = previous;
  reopenQuestion(); tell('한 번 되돌렸어요.'); updateBoard();
});
function route(moveFocus) {
  endConceptDrag();endOrbit();
  if ($('#talk').open) $('#talk').close();
  if ($('#reward').open) $('#reward').close();
  cancelDrag();
  artSpinning=false;
  const previousRoute=active;
  const name = location.hash.slice(1) || 'concepts';
  const concepts = name==='concepts';
  if (concepts && Object.hasOwn(lessons,active)) {
    $('#concept-return').href='#'+active;
    $('#concept-return').textContent=lessons[active].title+' 이어 하기';
  } else if (concepts && active==='home') {
    $('#concept-return').href='#home';
    $('#concept-return').textContent='놀이 고르기';
  }
  active = concepts || Object.hasOwn(lessons,name) ? name : 'home';
  const home = active === 'home';
  $('#quest-game').hidden=active!=='quiz';
  $('#workshop').dataset.quest=active==='quiz' ? (questStarted ? 'play' : 'intro') : '';
  $('#home').hidden = !home; $('#workshop').hidden = home || concepts; $('#concepts').hidden=!concepts;
  $('#play-tab').setAttribute('aria-current',concepts ? 'false' : 'page');
  $('#concept-tab').setAttribute('aria-current',concepts ? 'page' : 'false');
  document.title = home ? '쌓기나무 놀이터' : (concepts ? '쌓기나무 개념' : lessons[active].title)+' · 쌓기나무 놀이터';
  if (concepts) renderConcept();
  if (!home && !concepts) {
    if(active==='practice' && (!rabbitSet.length || previousRoute==='home')) {
      newRabbitSet();
      Object.assign(state.practice,{stacks:emptyBoard(),history:[],mode:'add',message:''});
      Object.assign(boardCameras.practice,cameraPresets.home,{preset:'home'});
    }
    $('#talk-open').hidden=active==='practice';
    camera = boardCameras[active];
    const art = active === 'art', quiz = active === 'quiz';
    $('#activity-title').textContent = lessons[active].title;
    $('#instruction').textContent = lessons[active].instruction;
    $('#reflect').textContent = lessons[active].reflect;
    $('#board-title').textContent = art ? '내 작품' : quiz ? '탐험 쌓기판' : '쌓기판';
    $('#quiz-actions').hidden = !quiz;
    $('#mission-icon').replaceChildren(festivalIcon(active));
    $('#modes').hidden = art; $('#view-toggle').hidden = !quiz;
    $('#art-shop').hidden = !art;
    $('#art-spin').hidden = !art;
    $('#quiz-wallet').hidden = !quiz;
    refreshShop();
    artBoard.classList.toggle('art-board',art);
    if (art) {
      artBoard.setAttribute('tabindex','0');
      artBoard.setAttribute('aria-label','작업판. 방향키로 위치를 고르고 엔터로 나무를 붙여요.');
    } else { artBoard.removeAttribute('tabindex'); artBoard.removeAttribute('aria-label'); }
    for (const el of $('#palette').children) {
      el.hidden=!art && !['wood','red','yellow'].includes(el.dataset.color);
      el.classList.toggle('art-tool',art);
    }
    chooseColor(currentState().color);
    if (quiz) showQuestion();
    $('#feedback').textContent = currentState().message;
    updateBoard();
  }
  if (moveFocus) {
    $(home ? '#home-title' : concepts ? '#concept-title' : '#activity-title').focus({preventScroll:true});
    window.scrollTo(0,0);
  }
}
buildPalette();
window.addEventListener('hashchange',() => route(true));
route(false);
