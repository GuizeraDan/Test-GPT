import {CARDS,createGame,canPlay,play,endTurn,chooseEnemy,beginBurst,resolveBurstHit} from './game.js';
// Altura dos feixes em pixels. Ajuste aqui para mudar o tamanho visual.
const BEAM_HEIGHT={normal:105,super:195};
const comboMotions=new Set();
let labMode=location.hash==='#lab'||document.body.dataset.mode==='lab';
const animationClock={time:0,speed:1,paused:false,last:null,waiters:[],
 wait(ms){return new Promise(resolve=>this.waiters.push({at:this.time+ms,resolve}));},
 drain(){const ready=this.waiters.filter(w=>w.at<=this.time);this.waiters=this.waiters.filter(w=>w.at>this.time);ready.forEach(w=>w.resolve());},
 cancelWaits(){const pending=this.waiters.splice(0);pending.forEach(w=>w.resolve());},
 step(){this.paused=true;this.time+=1000/60;for(const a of document.getAnimations()){a.pause();if(a.currentTime!==null)a.currentTime+=1000/60;}this.drain();}
};
function clockTick(now){if(animationClock.last!==null&&!animationClock.paused){animationClock.time+=Math.min(now-animationClock.last,80)*animationClock.speed;animationClock.drain();}animationClock.last=now;for(const a of document.getAnimations()){if(a.playbackRate!==animationClock.speed)a.playbackRate=animationClock.speed;if(animationClock.paused&&a.playState==='running')a.pause();else if(!animationClock.paused&&a.playState==='paused')a.play();}requestAnimationFrame(clockTick);}
requestAnimationFrame(clockTick);
function animateGame(element,frames,options){const animation=element.animate(frames,options);animation.playbackRate=animationClock.speed;if(animationClock.paused)animation.pause();return animation;}

var burstArt={};
var identitySheets={},identityCardCache={};
let identityEnabled=true;document.body.classList.add('pixel-identity');
let state=createGame(),generation=0,busy=false;const $=id=>document.getElementById(id);const types={'TÉCNICA':'technique','HABILIDADE':'ability','REAÇÃO':'reaction','TRANSFORMAÇÃO':'transformation'};
function hud(f,enemy){return `<div class="fighter-hud ${enemy?'enemy':''}"><div class="hud-name">${f.name.toUpperCase()}<small>${enemy?'OPONENTE · CPU':'VOCÊ · JOGADOR 01'}</small></div><div class="hp-label"><span>VIDA</span><b>${f.hp} <span>/ 100</span></b></div><div class="hp-track" role="progressbar" aria-label="Vida de ${f.name}" aria-valuenow="${f.hp}" aria-valuemin="0" aria-valuemax="100"><div class="hp-fill" style="width:${f.hp}%"></div></div><div class="ki-row"><span>KI</span>${Array.from({length:8},(_,i)=>`<i class="ki-cell ${i<f.ki?'filled':''}"></i>`).join('')}<b>${f.ki}/8</b></div><div class="status">${[f.shield?`◈ Escudo ${f.shield}`:'',f.reaction?'↯ Reação preparada':'',f.transformed?'✦ Super Saiyajin':''].filter(Boolean).join(' · ')||'Forma base · Pronto para o combate'}</div></div>`;}
function render(){ $('playerHud').innerHTML=hud(state.player,false);$('enemyHud').innerHTML=hud(state.enemy,true);$('round').textContent=`ROUND ${String(state.round).padStart(2,'0')}`;$('phase').textContent=state.winner?'FIM DO TREINO':state.turn==='player'?'SEU TURNO':'TURNO DA CPU';$('turnTitle').textContent=state.winner?'Treino concluído.':state.turn==='player'?'Sua vez de brilhar.':'Vegeta está planejando…';$('turnHint').textContent=state.turn==='player'?(state.actions?'Combine suas cartas. Encontre uma abertura.':'Suas ações acabaram. Encerre o turno para continuar.'):'Observe as técnicas do adversário e prepare sua resposta.';$('actions').innerHTML=`<b>${state.actions} / 2</b> AÇÕES`;$('endTurn').disabled=busy||state.turn!=='player'||!!state.winner;$('handCount').textContent=state.player.hand.length;$('deckCount').textContent=`▱ ${state.player.deck.length} NO BARALHO · ${state.player.discard.length} DESCARTE`;$('lastAction').textContent=state.log.at(-1);
$('hand').replaceChildren();(labMode?Object.keys(CARDS):state.player.hand).forEach((key,i)=>{const c=CARDS[key],button=document.createElement('button');button.className=`card ${types[c.type]}`;button.disabled=busy||(!labMode&&!canPlay(state,'player',i));button.setAttribute('aria-label',`${c.name}, ${c.cost} ki, ${c.actions||1} ações. ${c.description}`);button.innerHTML=`<div class="card-top"><span>${c.type}</span><b class="cost">${c.cost}</b></div><div class="card-art art-${key}"><span class="card-sprite"></span><span>${c.icon}</span></div><h3>${c.name}</h3><p>${c.description}</p><div class="card-stats"><span>${c.cost} KI</span><span>${c.actions||1} ${(c.actions||1)===1?'AÇÃO':'AÇÕES'}</span>${c.damage?`<span>${c.damage} DANO</span>`:''}</div><span class="card-foot">${labMode?(busy?'REPRODUZINDO':'TESTAR ANIMAÇÃO'):c.transform&&state.player.transformed?'JÁ TRANSFORMADO':c.reaction&&state.player.reaction?'REAÇÃO JÁ PREPARADA':state.player.ki<c.cost?'KI INSUFICIENTE':state.actions<(c.actions||1)?'AÇÕES INSUFICIENTES':(c.actions===2?'02 AÇÕES · ':'01 AÇÃO · ')+(c.damage?'OFENSIVA':c.reaction?'PREPARAR':'SUPORTE')}</span>`;button.onclick=()=>labMode?runLab(key):execute('player',i);$('hand').append(button);});if(!state.player.hand.length)$('hand').innerHTML='<p class="empty">Sem cartas na mão. Encerre o turno para comprar mais.</p>';for(const [side,id]of [['player','goku'],['enemy','vegeta']]){ $(id).classList.toggle('transformed',state[side].transformed);$(id).classList.toggle('shielded',state[side].shield>0);$(id).classList.toggle('reaction-ready',state[side].reaction>0); };$('logList').replaceChildren(...state.log.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));if(gokuAnimator)gokuAnimator.cards();if(burstArt.projectile)paintBurstCard();if(baseKameCardData)paintBaseKameCard();if(identityEnabled&&identitySheets.goku)paintIdentityCards();if(labMode)renderLab();}
async function execute(side,i){
 if(busy||!canPlay(state,side,i))return;
 const token=generation,key=state[side].hand[i],c=CARDS[key],target=side==='player'?'enemy':'player';
 const source=$(side==='player'?'goku':'vegeta'),dest=$(side==='player'?'vegeta':'goku');
 busy=true;source.dataset.move=key;render();if(identityEnabled){try{await identityReady;}catch{busy=false;clearBattleFx();render();$('lastAction').textContent='Não foi possível carregar a identidade visual.';return;}if(token!==generation)return;}
 if(side==='player'&&key==='beam'&&!state.player.transformed){try{await baseKameReady;}catch{busy=false;clearBattleFx();render();$('lastAction').textContent='Não foi possível carregar a animação base.';return;}if(token!==generation)return;}
 if(key==='superBeam'){try{await superImpactReady;}catch{busy=false;clearBattleFx();render();$('lastAction').textContent='Não foi possível carregar a explosão do Super Kamehameha.';return;}if(token!==generation)return;}
 const beam=key==='beam'||key==='superBeam',ranged=beam||key==='blast',originalCombo=side==='player'&&key==='strike'&&!state.player.transformed&&gokuAnimator?.ready(),originalBurst=side==='player'&&key==='blast'&&!state.player.transformed&&gokuAnimator?.ready();
 if(side==='player'&&(key==='beam'||key==='superBeam')&&gokuAnimator?.ready()){await executeKamehameha(i,token,key==='superBeam');return;}
 if(key==='blast'){await executeFourBlasts(side,i,token);return;}
 if(key==='strike'){await executeContactCombo(side,i,token);return;}
 source.classList.add(ranged?'charging':key==='strike'?'punching':key==='transform'?'powering':key==='charge'?'charging':'supporting');
 if(originalCombo){source.style.setProperty('--combo-travel',(dest.getBoundingClientRect().left-source.getBoundingClientRect().left-95)+'px');source.classList.add('combining');}
 if(ranged){$('lastAction').textContent=beam?(side==='player'?'Goku está preparando Kamehameha…':'Vegeta está preparando Galick Ho…'):'Concentrando energia…';}
 await delay(originalCombo?1600:originalBurst?380:beam?950:ranged?450:key==='transform'?850:300);
 if(token!==generation)return;
 if(ranged){source.classList.remove('charging');source.classList.add('firing');const fx=document.createElement('div');fx.className=`battle-fx ${beam?'energy-beam':'energy-blast'} ${side==='enemy'?'reverse purple':''}`;if(beam&&side==='player'&&gokuAnimator?.ready()){const beamCanvas=gokuAnimator.beam();beamCanvas.className=fx.className+' original-beam';document.querySelector('.battle').append(beamCanvas);}else if(originalBurst){spawnKiBurst();}else document.querySelector('.battle').append(fx);}
 if(originalBurst){await delay(330);if(token!==generation)return;spawnKiBurst();}
 if(key==='strike'&&!originalCombo)source.classList.add('attacking');
 await delay(ranged?220:key==='strike'?180:0);if(token!==generation)return;
 const hp=state[target].hp;play(state,side,i);render();if(key==='superBeam')startSuperImpact(dest,token);
 if(c.damage){dest.classList.add('hit');if(hp>state[target].hp)dest.classList.add('impact');else dest.classList.add('blocked');$('effect').textContent=hp-state[target].hp?`−${hp-state[target].hp}`:'BLOQUEADO';}
 else $('effect').textContent=c.transform?'SUPER SAIYAJIN':c.ki?'+2 KI':c.reaction?'REAÇÃO PRONTA':'+18 ESCUDO';
 $('effect').classList.remove('show');void $('effect').offsetWidth;$('effect').classList.add('show');
 await delay(key==='superBeam'?1180:beam?650:ranged?400:450);if(token!==generation)return;
 clearBattleFx();busy=false;render();
 if(state.winner&&!labMode){$('resultTitle').textContent=state.winner==='player'?'Você superou seus limites!':'Vegeta levou este round.';$('resultText').textContent=`Treino encerrado em ${state.round} rounds. ${state.winner==='player'?'Boa combinação de cartas e ki.':'Prepare suas defesas antes de gastar todo o ki.'}`;$('resultDialog').showModal();}
}
async function executeFourBlasts(side,index,token){
 const source=$(side==='player'?'goku':'vegeta'),dest=$(side==='player'?'vegeta':'goku');
 try{await Promise.all([burstArtReady,rajadaReady]);}catch{clearBattleFx();busy=false;render();$('lastAction').textContent='Não foi possível carregar as artes da Rajada de Ki.';return;}if(token!==generation)return;source.classList.add('charging');await delay(280);if(token!==generation)return;
 if(!beginBurst(state,side,index)){busy=false;clearBattleFx();render();return;}render();
 source.classList.remove('charging');source.classList.add('firing','four-blasts');
 for(let shot=0;shot<4;shot++){
  if(token!==generation)return;
  source.dataset.burstPose=String(shot%2);source.dataset.burstStage='ready';await delay(90);if(token!==generation)return;source.dataset.burstStage='emit';const native=side==='player'&&!state.player.transformed;const muzzle=native?null:spawnKiMuzzle(source,side);await delay(70);if(token!==generation)return;
  const projectile=makeBurstArt('projectile');
  projectile.className='battle-fx burst-shot'+(side==='enemy'?' reverse':'');
  const stage=document.querySelector('.battle'),a=stage.getBoundingClientRect(),from=source.getBoundingClientRect(),to=dest.getBoundingClientRect(),direction=side==='player'?1:-1;
  const shotWidth=44,shotHeight=34;const start=from.left-a.left+from.width/2+direction*(native?144:72)-shotWidth/2,end=to.left-a.left+to.width/2-shotWidth/2;
  projectile.style.top=(from.top-a.top+68-shotHeight/2)+'px';stage.append(projectile);
  const flight=animateGame(projectile,[{left:start+'px'},{left:end+'px'}],{duration:220,easing:'linear',fill:'forwards'});comboMotions.add(flight);
  await delay(80);if(token!==generation)return;muzzle?.remove();source.dataset.burstStage='ready';await delay(140);if(token!==generation)return;flight.cancel();comboMotions.delete(flight);projectile.remove();
  const result=resolveBurstHit(state);if(!result)return;render();
  const flash=animateGame(dest,[{filter:'brightness(2.3)',translate:direction*6+'px 0px'},{filter:'brightness(1)',translate:'0px 0px'}],{duration:150});comboMotions.add(flash);flash.onfinish=()=>comboMotions.delete(flash);
  const spark=makeBurstArt('impact');spark.className='battle-fx burst-impact'+(result.blocked?' guarded':'');spark.style.left=(to.left-a.left+to.width/2)+'px';spark.style.top=(to.top-a.top+68)+'px';stage.append(spark);spark.onanimationend=()=>spark.remove();
  $('effect').textContent=`${result.hit}/4 · ${result.damage?'−'+result.damage:'BLOQUEADO'}`;$('effect').classList.remove('show');void $('effect').offsetWidth;$('effect').classList.add('show');
  await delay(170);if(token!==generation)return;
 }
 clearBattleFx();busy=false;render();
 if(state.winner&&!labMode){$('resultTitle').textContent=state.winner==='player'?'Você superou seus limites!':'Vegeta levou este round.';$('resultText').textContent=`Treino encerrado em ${state.round} rounds.`;$('resultDialog').showModal();}
}
async function executeKamehameha(index,token,superPower=false){
 const source=$('goku'),dest=$('vegeta'),baseForm=!superPower&&!state.player.transformed;source.classList.toggle('base-kame',baseForm);source.classList.add('kame-preparing');source.classList.toggle('super-kame',superPower);$('lastAction').textContent=superPower?'Goku concentra todo seu ki… Super Kamehameha!':'Goku concentra o ki e libera seu poder…';
 await delay(baseForm?960:1440);if(token!==generation)return;
 source.classList.remove('four-blasts','super-kame','kame-preparing');source.classList.add('kame-firing');$('lastAction').textContent='Kame… hame… HA!';
 await delay(baseForm?80:540);if(token!==generation)return;
 const beam=gokuAnimator.beam(superPower,baseForm);beam.className='battle-fx energy-beam original-beam'+(superPower?' super-kame-beam':'');document.querySelector('.battle').append(beam);
 await delay(220);if(token!==generation)return;
 const hp=state.enemy.hp;play(state,'player',index);render();if(superPower){dest.classList.add('hit');if(hp===state.enemy.hp)dest.classList.add('blocked');startSuperImpact(dest,token);}else dest.classList.add('hit',hp>state.enemy.hp?'impact':'blocked');
 $('effect').textContent=hp>state.enemy.hp?`−${hp-state.enemy.hp}`:'BLOQUEADO';$('effect').classList.remove('show');void $('effect').offsetWidth;$('effect').classList.add('show');
 await delay(superPower?800:480);if(token!==generation)return;beam.remove();dest.classList.remove('hit','impact','blocked');source.classList.remove('kame-firing');source.classList.add('kame-recovering');
 await delay(baseForm?220:560);if(token!==generation)return;clearBattleFx();busy=false;render();
 if(state.winner&&!labMode){$('resultTitle').textContent='Você superou seus limites!';$('resultText').textContent=`Treino encerrado em ${state.round} rounds.`;$('resultDialog').showModal();}
}
async function executeContactCombo(side,index,token){
 const source=$(side==='player'?'goku':'vegeta'),dest=$(side==='player'?'vegeta':'goku'),target=side==='player'?'enemy':'player',direction=side==='player'?1:-1;
 const start=source.getBoundingClientRect(),end=dest.getBoundingClientRect();
 // Distância entre os centros: deixa o punho/chute alcançar o corpo do oponente.
 const separation=Math.min(66,end.width*.64),travel=end.left+end.width/2-(start.left+start.width/2)-direction*separation;
 const motion=animateGame(source,[{translate:'0px 0px'},{translate:`${travel}px 0px`}],{duration:240,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'});comboMotions.add(motion);
 $('lastAction').textContent=`${state[side].name} se aproxima para o combo…`;
 await delay(240);if(token!==generation)return;
 source.classList.add('punching');dest.classList.add('combo-receiving');
 const arena=document.querySelector('.battle'),counter=document.createElement('div');counter.className='battle-fx combo-counter';arena.append(counter);
 const blocked=state[target].shield+state[target].reaction>0;
 let last=0,hits=0;for(const at of [160,320,480,720,1040,1280,1440,1600]){
  await delay(at-last);last=at;if(token!==generation)return;hits++;
  const bounds=arena.getBoundingClientRect(),body=dest.getBoundingClientRect(),x=body.left-bounds.left+body.width/2,y=body.top-bounds.top+72;
  const spark=document.createElement('div');spark.className='battle-fx contact-spark'+(blocked?' guarded':'');spark.style.left=(x-direction*16+(hits%3-1)*9)+'px';spark.style.top=(y+(hits%2? -9:10))+'px';arena.append(spark);
  const recoil=animateGame(dest,[{translate:'0px 0px',filter:'brightness(1)'},{translate:`${direction*(hits===8?16:8)}px 0px`,filter:blocked?'brightness(1.5)':'brightness(2.5)'},{translate:'0px 0px',filter:'brightness(1)'}],{duration:150});comboMotions.add(recoil);recoil.onfinish=()=>comboMotions.delete(recoil);
  counter.style.left=x+'px';counter.style.top=(y-106)+'px';counter.textContent=`${hits} ${blocked?'IMPACTOS NA DEFESA':'HITS'}`;$('lastAction').textContent=`${state[side].name}: combo em contato · ${hits} impactos.`;
  spark.addEventListener('animationend',()=>spark.remove(),{once:true});
 }
 await delay(160);if(token!==generation)return;
 const hp=state[target].hp;play(state,side,index);render();
 counter.textContent=`${hits} HITS · ${hp-state[target].hp?'-'+(hp-state[target].hp)+' HP':'BLOQUEADO'}`;
 $('effect').textContent=hp>state[target].hp?`−${hp-state[target].hp}`:'BLOQUEADO';$('effect').classList.remove('show');void $('effect').offsetWidth;$('effect').classList.add('show');
 source.classList.remove('punching');dest.classList.remove('four-blasts','super-kame','kame-preparing','kame-firing','kame-recovering','combo-receiving');await delay(140);if(token!==generation)return;
 motion.cancel();comboMotions.delete(motion);
 const back=animateGame(source,[{translate:`${travel}px 0px`},{translate:'0px 0px'}],{duration:260,easing:'ease-out',fill:'forwards'});comboMotions.add(back);
 await delay(260);if(token!==generation)return;back.cancel();comboMotions.delete(back);clearBattleFx();busy=false;render();
 if(state.winner&&!labMode){$('resultTitle').textContent=state.winner==='player'?'Você superou seus limites!':'Vegeta levou este round.';$('resultText').textContent=`Treino encerrado em ${state.round} rounds.`;$('resultDialog').showModal();}
}
function spawnKiBurst(){const projectile=gokuAnimator.blast();projectile.className='battle-fx energy-blast original-ki';document.querySelector('.battle').append(projectile);}
function clearBattleFx(){document.querySelectorAll('.base-kame').forEach(e=>e.classList.remove('base-kame'));for(const animation of comboMotions)animation.cancel();comboMotions.clear();document.querySelectorAll('.battle-fx').forEach(e=>e.remove());for(const id of ['goku','vegeta'])$(id).classList.remove('four-blasts','super-kame','kame-preparing','kame-firing','kame-recovering','combo-receiving','combining','charging','firing','powering','punching','supporting','attacking','hit','impact','blocked');}
const delay=ms=>animationClock.wait(ms);$('endTurn').onclick=async()=>{if(busy||state.turn!=='player'||state.winner)return;const token=generation;endTurn(state);render();await delay(900);for(let n=0;n<2;n++){if(token!==generation||state.winner)return;const i=chooseEnemy(state);if(i<0)break;await execute('enemy',i);await delay(400);}if(token!==generation||state.winner)return;endTurn(state);render();};
function reset(){generation++;animationClock.cancelWaits();busy=false;clearBattleFx();state=createGame();if(labMode)prepareLabState();document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();} $('restart').onclick=reset;$('playAgain').onclick=reset;$('help').onclick=()=>$('helpDialog').showModal();$('logButton').onclick=()=>$('logDialog').showModal();document.querySelectorAll('.close,.close-help').forEach(b=>b.onclick=()=>b.closest('dialog').close());render();

function setSprite(id,src){const fighter=$(id);let img=fighter.querySelector('.sprite-img');if(!img){img=document.createElement('img');img.className='sprite-img';img.alt='';fighter.append(img);}img.src=src;fighter.classList.add('has-sprite');fighter.classList.remove('atlas-fighter');}
$('spriteButton').onclick=()=>$('spriteDialog').showModal();
for(const id of ['goku','vegeta'])$(id+'Upload').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(!['image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){$('spriteStatus').textContent='Use PNG ou WebP de até 8 MB.';return;}try{const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});const probe=new Image();probe.src=src;await probe.decode();setSprite(id,src);$('spriteStatus').textContent='Sprite aplicado! Feche esta janela para testar.';}catch{$('spriteStatus').textContent='Não foi possível abrir essa imagem. Tente outro arquivo.'}};
$('spriteScale').oninput=e=>{document.querySelectorAll('.fighter').forEach(f=>{f.style.setProperty('--sprite-height',Math.round(Number(e.target.value)*168/110)+'px');f.style.setProperty('--sprite-width',Math.round(Number(e.target.value)*145/110)+'px');});};
$('restoreSprites').onclick=()=>{document.querySelectorAll('.sprite-img').forEach(i=>i.remove());document.querySelectorAll('.fighter').forEach(f=>{f.classList.remove('has-sprite');f.style.removeProperty('--sprite-height');f.style.removeProperty('--sprite-width');});$('spriteScale').value=110;document.querySelectorAll('#spriteDialog input[type=file]').forEach(i=>i.value='');restoreAtlas();$('spriteStatus').textContent='Visuais restaurados.';};

function restoreAtlas(){for(const id of ['goku','vegeta']){const f=$(id);f.classList.add('atlas-fighter');if(!f.querySelector('.atlas-sprite')){const sprite=document.createElement('div');sprite.className='atlas-sprite';f.append(sprite);}}}
restoreAtlas();

// Coordenadas na referência de 731 px; escaladas para o PNG original intacto.
// [x, y, largura, altura, duração em ms, ponto de apoio horizontal opcional]
const GOKU_CLIPS={
 burstFire:[[123,539,33,38,110,139],[222,539,31,38,110,238]],
 kamePrepare:[[87,627,24,37,140],[117,623,40,41,140],[159,608,48,56,180],[210,607,49,57,220],[266,621,40,43,140],[313,621,38,43,140],[357,618,35,45,140],[401,607,48,57,180],[457,623,23,41,160]],
 kameFire:[[45,702,29,39,100],[79,702,26,39,100],[115,702,25,39,100],[152,697,32,44,140],[197,702,26,39,100],[236,702,30,39,120],[276,703,27,38,200]],
 kameRecover:[[357,618,35,45,140],[313,621,38,43,140],[266,621,40,43,140],[87,627,24,37,140]],
 kiBurst:[[44,539,26,38,100,56],[80,539,33,38,180,94],[123,539,33,38,100,139],[123,539,33,38,230,139],[222,539,31,38,100,238],[222,539,31,38,240,238]],
 idle:[[112,90,23,35,220],[142,86,23,39,240],[172,87,23,38,220],[204,89,24,36,240]],
 strike:[[44, 294, 27, 40, 80], [76, 296, 28, 38, 80], [109, 297, 35, 37, 80], [144, 296, 31, 38, 80], [176, 296, 34, 38, 80], [212, 293, 29, 41, 80], [241, 297, 36, 37, 80], [281, 296, 29, 38, 80], [313, 294, 25, 40, 80], [343, 292, 28, 40, 80], [372, 298, 33, 33, 80], [410, 298, 33, 33, 80], [44, 353, 25, 38, 80], [71, 353, 29, 39, 80], [105, 353, 26, 39, 80], [139, 354, 33, 35, 80], [172, 355, 34, 35, 80], [212, 355, 27, 37, 80], [245, 354, 24, 38, 80], [270, 354, 36, 35, 80], [308, 353, 37, 36, 80], [347, 351, 26, 39, 80]],
 charge:[[87,627,24,37,180],[117,623,40,41,180],[159,608,48,56,180],[210,607,49,57,220]],
 beamCharge:[[124,539,31,38,220],[158,538,59,39,200,172],[124,539,31,38,200],[158,538,59,39,240,172]],
 fire:[[158,538,35,39,180,172],[257,538,35,39,180,272]],
 hurt:[[73,480,31,33,140],[105,475,36,38,160],[144,475,24,38,180]],
 evade:[[373,297,32,33,100],[410,297,33,33,140]],
 transform:[[117,623,40,41,140],[159,608,48,56,140],[210,607,49,57,180],[266,621,40,43,160],[313,621,38,43,160],[357,618,35,45,180],[401,607,48,57,220]],
 ssjIdle:[[401,607,48,57,240]],
 ssjCharge:[[152,697,32,44,230],[197,702,26,39,200],[152,697,32,44,220]],
 ssjFire:[[236,702,30,39,160],[276,703,29,38,180]],
 ssjStrike:[[457,623,23,41,110],[197,702,26,39,100],[237,702,29,39,140]]
};
var gokuAnimator;
function makeGokuAnimator(){
 const fighter=$('goku'),canvas=document.createElement('canvas');canvas.className='goku-frames';canvas.width=384;canvas.height=336;canvas.setAttribute('aria-hidden','true');fighter.append(canvas);
 const ctx=canvas.getContext('2d'),sheet=new Image();sheet.src='/assets/goku-original.png';
 const cache=new Map();let active='',started=0,preview=null,ready=false;
 function frameTexture(f){const key=f.slice(0,4).join(',');if(cache.has(key))return cache.get(key);const scale=sheet.naturalWidth/731,[x,y,w,h]=f;const cut=document.createElement('canvas');cut.width=Math.ceil(w*scale);cut.height=Math.ceil(h*scale);const c=cut.getContext('2d',{willReadFrequently:true});c.drawImage(sheet,Math.round(x*scale),Math.round(y*scale),cut.width,cut.height,0,0,cut.width,cut.height);
 // Remove somente o branco conectado às bordas, preservando os brancos internos.
 const data=c.getImageData(0,0,cut.width,cut.height),px=data.data,W=cut.width,H=cut.height,seen=new Uint8Array(W*H),queue=[];
 const add=(n)=>{if(n<0||n>=W*H||seen[n])return;seen[n]=1;const i=n*4;if(px[i]>=244&&px[i+1]>=244&&px[i+2]>=244)queue.push(n);};
 for(let x=0;x<W;x++){add(x);add((H-1)*W+x);}for(let y=0;y<H;y++){add(y*W);add(y*W+W-1);}for(let q=0;q<queue.length;q++){const n=queue[q];px[n*4+3]=0;const x=n%W;if(x)add(n-1);if(x<W-1)add(n+1);add(n-W);add(n+W);}c.putImageData(data,0,0);cache.set(key,cut);return cut;}
 function paintCards(){if(!ready)return;const mapping={strike:'strike',beam:'ssjFire',superBeam:'ssjFire',charge:'charge',guard:'idle',evade:'evade',transform:'ssjIdle'};for(const [key,name]of Object.entries(mapping)){const el=document.querySelector('.art-'+key+' .card-sprite');if(el){el.style.backgroundImage='url("'+frameTexture(key==='superBeam'?[303,674,260,91,1]:GOKU_CLIPS[name][key==='beam'?0:key==='blast'?3:key==='strike'?6:0]).toDataURL()+'")';el.style.backgroundSize='contain';el.style.backgroundPosition='center';}}if(baseKameCardData)paintBaseKameCard();if(identityEnabled&&identitySheets.goku)paintIdentityCards();}
 function current(){if(preview)return preview;if(fighter.classList.contains('base-kame')){if(fighter.classList.contains('kame-preparing'))return 'baseKameCharge';if(fighter.classList.contains('kame-firing'))return 'baseKameFire';if(fighter.classList.contains('kame-recovering'))return 'baseKameRecover';}if(fighter.classList.contains('kame-preparing'))return 'kamePrepare';if(fighter.classList.contains('kame-firing'))return 'kameFire';if(fighter.classList.contains('kame-recovering'))return 'kameRecover';const ssj=fighter.classList.contains('transformed');if(fighter.classList.contains('four-blasts'))return ssj?'ssjFire':'rajadaFire';if(fighter.dataset.move==='blast'&&!ssj&&(fighter.classList.contains('charging')||fighter.classList.contains('firing')))return 'rajadaPrepare';if(fighter.classList.contains('hit')||fighter.classList.contains('combo-receiving'))return ssj?'ssjIdle':'hurt';if(fighter.classList.contains('powering'))return 'transform';if(fighter.classList.contains('firing'))return ssj?'ssjFire':'fire';if(fighter.classList.contains('punching'))return ssj?'ssjStrike':'strike';if(fighter.classList.contains('supporting'))return fighter.dataset.move==='guard'?'guard':fighter.dataset.move==='evade'?'evade':'idle';if(fighter.classList.contains('shielded'))return ssj?'ssjIdle':'guard';if(fighter.classList.contains('charging'))return ssj?'ssjCharge':fighter.dataset.move==='beam'?'beamCharge':'charge';return ssj?'ssjIdle':'idle';}
 function tick(){
  const t=animationClock.time;
  if(ready&&fighter.classList.contains('atlas-fighter')){
   const name=current();if(name!==active){active=name;started=t;}
   const base=baseKameSheet&&name.startsWith('baseKame');const native=rajadaSheet&&['kiBurst','rajadaPrepare','rajadaFire'].includes(name);const themed=identityEnabled&&identitySheets.goku&&!base&&!native;
   const frames=themed?identityFrames(name):base?(name==='baseKameCharge'?BASE_KAME_FRAMES.slice(0,5):name==='baseKameFire'?BASE_KAME_FRAMES.slice(5,7):name==='baseKameRecover'?BASE_KAME_FRAMES.slice(7):BASE_KAME_FRAMES):native?(name==='rajadaPrepare'?RAJADA_FRAMES.slice(0,2):name==='rajadaFire'?RAJADA_FRAMES.slice(2):RAJADA_FRAMES):GOKU_CLIPS[name]||GOKU_CLIPS.idle;
   const duration=frames.reduce((a,f)=>a+f[4],0),loop=!!preview||['burstFire','idle','charge','beamCharge','ssjIdle','ssjCharge'].includes(name);let elapsed=loop?(t-started)%duration:Math.min(t-started,duration-1),frame=frames[0];
   for(const f of frames){frame=f;if(elapsed<f[4])break;elapsed-=f[4];}
   if(name==='rajadaFire'&&!preview)frame=frames[(Number(fighter.dataset.burstPose||0)%2)*2+(fighter.dataset.burstStage==='emit'?1:0)];
   const frameIndex=frames.indexOf(frame);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
   if(base){const cell=frame[0],w=baseKameSheet.width/4,h=baseKameSheet.height/2,destH=256,destW=destH*w/h;ctx.drawImage(baseKameSheet,(cell%4)*w,Math.floor(cell/4)*h,w,h,canvas.width/2-destW/2,canvas.height-18-destH*.9,destW,destH);}
   else if(themed){drawIdentityPose(ctx,identitySheets.goku,frame[0],canvas.width,canvas.height);}
   else if(native){const [x,y,w,h,,anchor]=frame,z=256/180;ctx.drawImage(rajadaSheet,x,y,w,h,canvas.width/2-(anchor-x)*z,canvas.height-18-h*z,w*z,h*z);}
   else{const tex=frameTexture(frame),scale=sheet.naturalWidth/731,z=256/48/scale,anchor=(frame[5]===undefined?frame[2]/2:frame[5]-frame[0])*scale;ctx.drawImage(tex,canvas.width/2-anchor*z,canvas.height-18-tex.height*z,tex.width*z,tex.height*z);}
   const muzzleVisible=native&&(name==='rajadaFire'?frameIndex%2===1:name==='kiBurst'&&[3,5].includes(frameIndex));canvas.dataset.muzzle=muzzleVisible?'native-sheet':'none';canvas.dataset.clip=name;canvas.dataset.frame=String(frameIndex);canvas.dataset.source=base?'base-kame-atlas':native?'rajada-sheet':themed?'identity-goku':'goku-sheet';
   const pc=$('animationPreview');if(pc&&$('spriteDialog').open){const context=pc.getContext('2d');context.clearRect(0,0,pc.width,pc.height);context.imageSmoothingEnabled=false;context.drawImage(canvas,0,0);if(muzzleVisible&&burstArt.projectile){const shot=burstArt.projectile,h=42,w=h*shot.width/shot.height;context.drawImage(shot,390,canvas.height-18-21.5*256/48-h/2,w,h);}$('animationFrame').textContent=`Quadro ${frameIndex+1} / ${frames.length}`;}
  }requestAnimationFrame(tick);
 }

 sheet.onload=()=>{ready=true;paintCards();fighter.classList.add('original-sprites');$('spriteStatus').textContent='A Rajada usa a folha original selecionada. O laboratório permite comparar as duas identidades visuais.';};sheet.onerror=()=>{$('spriteStatus').textContent='Falha ao carregar a folha de Goku. O visual anterior foi mantido.';};requestAnimationFrame(tick);return {preview(name){preview=name;active='';},clear(){preview=null;active='';},cards:paintCards,blast(){const texture=frameTexture([185,540,31,36,1]),copy=document.createElement('canvas');copy.width=texture.width;copy.height=texture.height;copy.getContext('2d').drawImage(texture,0,0);return copy;},beam(superPower=false,baseForm=false){const texture=frameTexture([303,674,260,91,1]),copy=document.createElement('canvas');const arena=document.querySelector('.battle').getBoundingClientRect(),source=$('goku').getBoundingClientRect(),target=$('vegeta').getBoundingClientRect();const left=source.left-arena.left+source.width/2+(baseForm?56:32),width=Math.max(130,target.left-arena.left+target.width/2+22-left),height=superPower?BEAM_HEIGHT.super:BEAM_HEIGHT.normal;copy.width=Math.round(width*2);copy.height=height*2;copy.style.left=left+'px';copy.style.top=(source.top-arena.top+(baseForm?84:68)-height/2)+'px';copy.style.width=width+'px';copy.style.height=height+'px';const c=copy.getContext('2d');c.imageSmoothingEnabled=false;const cap=texture.width*.28,outCap=Math.min(copy.width*.35,cap/texture.height*copy.height);c.drawImage(texture,0,0,cap,texture.height,0,0,outCap,copy.height);c.drawImage(texture,cap,0,texture.width-2*cap,texture.height,outCap,0,copy.width-2*outCap,copy.height);c.drawImage(texture,texture.width-cap,0,cap,texture.height,copy.width-outCap,0,outCap,copy.height);return copy;},ready:()=>ready};
}
gokuAnimator=makeGokuAnimator();

$('animationSelect').onchange=e=>gokuAnimator.preview(e.target.value);
$('spriteButton').addEventListener('click',()=>gokuAnimator.preview($('animationSelect').value));
$('spriteDialog').addEventListener('close',()=>gokuAnimator.clear());

// Composição do cenário a partir da folha original, sem modificar o arquivo.
function mountTemple(){
 const canvas=$('templeScenery'),context=canvas.getContext('2d'),image=new Image();image.src='/assets/temple-original.png';let architecture;
 function draw(){if(!architecture)return;const box=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);if(!box.width||!box.height)return;canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);context.setTransform(dpr,0,0,dpr,0,0);context.imageSmoothingEnabled=false;const w=box.width,h=box.height;context.clearRect(0,0,w,h);
  // Só a região azul da folha: exclui a faixa de créditos e o verde inferior.
  context.drawImage(image,369,0,256,255,0,0,w,h);
  // Um único enquadramento contínuo: não repete fatias do teto/piso.
  // Em telas estreitas, recorta as laterais em vez de comprimir as colunas.
  const sceneWidth=Math.max(w,h*368/273),left=(w-sceneWidth)/2;
  context.drawImage(architecture,0,0,368,273,left,0,sceneWidth,h);canvas.dataset.ready='true';
 }
 image.onload=()=>{architecture=document.createElement('canvas');architecture.width=368;architecture.height=273;const c=architecture.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0,368,273,0,0,368,273);const pixels=c.getImageData(0,0,368,273);for(let i=0;i<pixels.data.length;i+=4){if(pixels.data[i+1]>55&&pixels.data[i+1]>pixels.data[i]+25&&pixels.data[i+1]>pixels.data[i+2]+25)pixels.data[i+3]=0;}c.putImageData(pixels,0,0);draw();};
 image.onerror=()=>console.error('Não foi possível carregar a folha do templo.');new ResizeObserver(draw).observe(canvas);
}
mountTemple();

const burstArtReady=Promise.all(['projectile','impact','muzzle'].map(async kind=>{
 const image=new Image();image.src={projectile:'/assets/ki-projectile-original.png',impact:'/assets/ki-impact-original.png',muzzle:'/assets/ki-muzzle-original.png'}[kind];await image.decode();
 const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
 const data=ctx.getImageData(0,0,canvas.width,canvas.height),p=data.data,matte=[p[0],p[1],p[2]],keyBackground=p[3]>240;let left=canvas.width,top=canvas.height,right=-1,bottom=-1;
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const i=(y*canvas.width+x)*4;if(keyBackground&&Math.max(Math.abs(p[i]-matte[0]),Math.abs(p[i+1]-matte[1]),Math.abs(p[i+2]-matte[2]))<40)p[i+3]=0;if(p[i+3]<=8)p[i+3]=0;if(p[i+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
 if(right<left)throw new Error('Arte vazia: '+kind);ctx.putImageData(data,0,0);const cut=document.createElement('canvas');cut.width=right-left+1;cut.height=bottom-top+1;cut.getContext('2d').drawImage(canvas,left,top,cut.width,cut.height,0,0,cut.width,cut.height);burstArt[kind]=cut;
})).then(()=>paintBurstCard());
function makeBurstArt(kind){const art=burstArt[kind],canvas=document.createElement('canvas');canvas.width=art.width;canvas.height=art.height;canvas.getContext('2d').drawImage(art,0,0);canvas.dataset.art=kind;return canvas;}
function paintBurstCard(){const art=document.querySelector('.art-blast .card-sprite');if(art&&burstArt.projectile){art.style.backgroundImage='url("'+burstArt.projectile.toDataURL()+'")';art.style.backgroundSize='contain';art.style.backgroundPosition='center';}}

// Folha de explosão original: cinco colunas e duas linhas.
var superImpactSheet;
const superImpactReady=(async()=>{
 const image=new Image();image.src='/assets/super-impact-original.png';await image.decode();
 const sheet=document.createElement('canvas');sheet.width=image.naturalWidth;sheet.height=image.naturalHeight;const ctx=sheet.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
 // O PNG contém resíduo de alfa quase transparente fora dos efeitos.
 const data=ctx.getImageData(0,0,sheet.width,sheet.height);for(let i=3;i<data.data.length;i+=4)if(data.data[i]<=8)data.data[i]=0;ctx.putImageData(data,0,0);superImpactSheet=sheet;
})();
function startSuperImpact(target,token){
 const arena=document.querySelector('.battle'),bounds=arena.getBoundingClientRect(),body=target.getBoundingClientRect();
 const canvas=document.createElement('canvas');canvas.width=400;canvas.height=400;canvas.className='battle-fx super-impact';canvas.dataset.frame='0';
 const size=Math.min(350,bounds.height*.76,bounds.width*.58);canvas.style.width=size+'px';canvas.style.height=size+'px';canvas.style.left=(body.left-bounds.left+body.width/2)+'px';canvas.style.top=(body.top-bounds.top+75)+'px';arena.append(canvas);
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const times=[65,65,80,90,100,110,120,140,150,180],duration=times.reduce((a,b)=>a+b,0);let start;
 function tick(){const now=animationClock.time;if(token!==generation||!canvas.isConnected){canvas.remove();return;}if(start===undefined)start=now;let elapsed=now-start;if(elapsed>=duration){canvas.remove();return;}let index=0;while(index<times.length-1&&elapsed>=times[index]){elapsed-=times[index];index++;}
  const column=index%5,row=Math.floor(index/5),x=Math.round(column*superImpactSheet.width/5),right=Math.round((column+1)*superImpactSheet.width/5),y=Math.round(row*superImpactSheet.height/2),bottom=Math.round((row+1)*superImpactSheet.height/2);
  ctx.clearRect(0,0,400,400);ctx.drawImage(superImpactSheet,x,y,right-x,bottom-y,0,0,400,400);canvas.dataset.frame=String(index);requestAnimationFrame(tick);
 }requestAnimationFrame(tick);return canvas;
}

function prepareLabState(){
 const side=$('labActor').value,target=side==='player'?'enemy':'player';state.turn=side;state.actions=2;state.winner=null;state.player.hand=Object.keys(CARDS);state.enemy.hand=Object.keys(CARDS);state.player.ki=8;state.enemy.ki=8;state[side].transformed=$('labForm').value==='ssj';
 const defense=$('labDefense').value;state[target].shield=defense==='shield'?18:0;state[target].reaction=defense==='reaction'?15:0;
}
function renderLab(){
 $('round').textContent='LAB';$('handCount').textContent=Object.keys(CARDS).length;$('phase').textContent=busy?'ANIMAÇÃO EM CURSO':'TESTE LIVRE';$('turnTitle').textContent='Todas as cartas. Sem esperar turnos.';$('turnHint').textContent='Clique em uma carta ou use Reproduzir. O alvo é restaurado a cada teste.';$('actions').textContent='TESTE LIVRE';$('deckCount').textContent='8 CARTAS DISPONÍVEIS';$('labPlay').disabled=busy;$('labSkill').disabled=busy;$('labActor').disabled=busy;$('labForm').disabled=busy;$('labDefense').disabled=busy;$('labStyle').disabled=busy;
 $('labPause').textContent=animationClock.paused?'▶ Continuar':'Ⅱ Pausar';$('labStatus').textContent=animationClock.paused?'Pausado · use avanço para inspecionar':busy?'Reproduzindo…':'Pronto para testar';
}
function toggleLab(enabled){
 labMode=enabled;document.body.classList.toggle('lab-mode',enabled);$('labPanel').hidden=!enabled;animationClock.paused=false;animationClock.speed=enabled?Number($('labSpeed').value):1;
 try{history.replaceState(null,'',location.href.split('#')[0]+(enabled?'#lab':''));}catch{}if(!enabled){$('labRepeat').checked=false;identityEnabled=true;document.body.classList.add('pixel-identity');$('labStyle').value='new';}
 reset();$('labToggle').textContent=enabled?'Voltar à partida':'Laboratório de animações';
}
async function runLab(key=$('labSkill').value){
 if(!labMode||busy)return;animationClock.paused=false;$('labSkill').value=key;generation++;animationClock.cancelWaits();clearBattleFx();state=createGame();prepareLabState();const side=$('labActor').value;
 if(key==='transform')state[side].transformed=false;const token=generation;const index=state[side].hand.indexOf(key);gokuAnimator?.clear();render();
 try{await execute(side,index);}catch(error){if(token!==generation)return;clearBattleFx();busy=false;render();$('labStatus').textContent='Erro ao reproduzir. Confira o histórico.';console.error(error);return;}
 if(token!==generation||!labMode)return;state.player.hand=Object.keys(CARDS);state.enemy.hand=Object.keys(CARDS);state.player.ki=8;state.enemy.ki=8;state.actions=2;render();
 if($('labRepeat').checked){await delay(600);if(token===generation&&labMode&&$('labRepeat').checked)runLab(key);}
}
$('labSkill').replaceChildren(...Object.entries(CARDS).map(([key,card])=>{const option=document.createElement('option');option.value=key;option.textContent=card.name;return option;}));
$('labToggle').onclick=()=>toggleLab(!labMode);$('labExit').onclick=()=>toggleLab(false);$('labPlay').onclick=()=>runLab();$('labPause').onclick=()=>{animationClock.paused=!animationClock.paused;renderLab();};$('labStep').onclick=()=>{animationClock.step();renderLab();};$('labReset').onclick=()=>{animationClock.paused=false;reset();};$('labSpeed').onchange=()=>{animationClock.speed=Number($('labSpeed').value);};
for(const id of ['labActor','labForm','labDefense'])$(id).onchange=()=>reset();
if(labMode)toggleLab(true);

function spawnKiMuzzle(source,side){
 const stage=document.querySelector('.battle'),a=stage.getBoundingClientRect(),body=source.getBoundingClientRect(),direction=side==='player'?1:-1,flash=makeBurstArt('muzzle');
 flash.className='battle-fx ki-muzzle'+(side==='enemy'?' reverse':'');flash.style.left=(body.left-a.left+body.width/2+direction*64)+'px';flash.style.top=(body.top-a.top+68)+'px';stage.append(flash);return flash;
}

// Seis quadros fornecidos em Rajada.jpg; pivôs alinhados pela base dos pés.
var rajadaSheet;
const RAJADA_FRAMES=[
 [30,0,110,151,120,80.5],[165,0,150,151,160,231.5],
 [335,0,135,151,100,384.5],[470,0,165,151,220,512.5],
 [640,0,125,151,100,683],[775,0,171,151,220,815]
];
const rajadaReady=(async()=>{
 const image=new Image();image.src='/assets/rajada-action-original.jpg';await image.decode();const sheet=document.createElement('canvas');sheet.width=image.naturalWidth;sheet.height=image.naturalHeight;const c=sheet.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
 const data=c.getImageData(0,0,sheet.width,sheet.height),p=data.data,W=sheet.width,H=sheet.height,seen=new Uint8Array(W*H),queue=[];
 const add=n=>{if(n<0||n>=W*H||seen[n])return;seen[n]=1;const i=n*4;if(p[i]>=237&&p[i+1]>=237&&p[i+2]>=237)queue.push(n);};for(let x=0;x<W;x++){add(x);add((H-1)*W+x);}for(let y=0;y<H;y++){add(y*W);add(y*W+W-1);}for(let q=0;q<queue.length;q++){const n=queue[q],x=n%W;p[n*4+3]=0;if(x)add(n-1);if(x<W-1)add(n+1);add(n-W);add(n+W);}
 // As duas emissões da montagem JPG ainda têm o antigo fundo vermelho ao redor.
 for(const [left,right,top,bottom] of [[579,635,15,136],[873,946,12,137]])for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){const i=(y*W+x)*4,r=p[i],g=p[i+1],b=p[i+2];if(r>60&&r<240&&g<135&&b<135&&r>g*1.5&&r>b*1.5)p[i+3]=0;}
 c.putImageData(data,0,0);rajadaSheet=sheet;
})();

// Nova sequência desenhada para o Kamehameha base: 4 colunas × 2 linhas.
var baseKameSheet,baseKameCardData;
const BASE_KAME_FRAMES=[[0,0,0,0,120],[1,0,0,0,140],[2,0,0,0,240],[3,0,0,0,300],[4,0,0,0,160],[5,0,0,0,160],[6,0,0,0,620],[7,0,0,0,220]];
const baseKameReady=(async()=>{const image=new Image();image.src='/assets/base-kame-atlas.png';await image.decode();baseKameSheet=image;const c=document.createElement('canvas');c.width=Math.round(image.width/4);c.height=Math.round(image.height/2);c.getContext('2d').drawImage(image,image.width/4,image.height/2,image.width/4,image.height/2,0,0,c.width,c.height);baseKameCardData=c.toDataURL();paintBaseKameCard();})();
function paintBaseKameCard(){const art=document.querySelector('.art-beam .card-sprite');if(art&&baseKameCardData){art.style.backgroundImage='url("'+baseKameCardData+'")';art.style.backgroundSize='contain';art.style.backgroundPosition='center';}}

// Identidade visual compartilhada. As folhas originais continuam disponíveis no laboratório.
function identityFrames(name){
 const make=(indices,durations=160)=>indices.map((cell,i)=>[cell,0,0,0,Array.isArray(durations)?durations[i%durations.length]:durations]);
 const strike=[2,3,2,4,5,6,2,3,4,5,6,2,3,4,5,6,3,4,5,6,3,0];
 const map={idle:()=>make([0,1],240),strike:()=>make(strike,80),hurt:()=>make([7,7,0],[90,120,180]),charge:()=>make([8,9],180),guard:()=>make([10],260),evade:()=>make([11,11,0],120),fire:()=>make([12,13],160),burstFire:()=>make([12,13],110),transform:()=>make([0,8,9,9,14],[140,140,180,200,300]),ssjIdle:()=>make([14],240),ssjCharge:()=>make([14],200),ssjFire:()=>make([15],220),ssjStrike:()=>make(strike.map((_,i)=>i%2?15:14),80),kamePrepare:()=>make([0,8,9,9,9,14,14,14,14],[140,140,180,220,140,140,140,180,160]),kameFire:()=>make([14,14,14,14,14,15,15],[100,100,100,140,100,120,200]),kameRecover:()=>make([14,14,0,0],140),beamCharge:()=>make([8,9],240)};
 return (map[name]||map.idle)();
}
function drawIdentityPose(ctx,image,cell,width=384,height=336){const w=image.width/4,h=image.height/4,destH=232,destW=destH*w/h;ctx.drawImage(image,(cell%4)*w,Math.floor(cell/4)*h,w,h,width/2-destW/2,height-18-destH*.94,destW,destH);}
const identityReady=Promise.all(['goku','vegeta'].map(async name=>{const image=new Image();image.src={goku:'/assets/identity-goku.png',vegeta:'/assets/identity-vegeta.png'}[name];await image.decode();identitySheets[name]=image;})).then(()=>{document.body.classList.add('identity-ready');render();});
function paintIdentityCards(){
 const actor=labMode&&$('labActor').value==='enemy'?'vegeta':'goku',sheet=identitySheets[actor];if(!sheet)return;
 for(const [key,cell]of Object.entries({strike:3,superBeam:15,beam:13,charge:9,guard:10,evade:11,transform:14})){
  if(key==='beam'&&actor==='goku'){paintBaseKameCard();continue;}const el=document.querySelector('.art-'+key+' .card-sprite');if(!el)continue;const cacheKey=actor+'-'+cell;
  if(!identityCardCache[cacheKey]){const c=document.createElement('canvas');c.width=160;c.height=160;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(sheet,(cell%4)*sheet.width/4,Math.floor(cell/4)*sheet.height/4,sheet.width/4,sheet.height/4,0,0,160,160);identityCardCache[cacheKey]=c.toDataURL();}
  el.style.backgroundImage='url("'+identityCardCache[cacheKey]+'")';el.style.backgroundSize='contain';el.style.backgroundPosition='center';
 }
}
function makeVegetaIdentityAnimator(){
 const fighter=$('vegeta'),canvas=document.createElement('canvas');canvas.width=384;canvas.height=336;canvas.className='vegeta-frames';canvas.setAttribute('aria-hidden','true');fighter.append(canvas);const ctx=canvas.getContext('2d');let active='',started=0;
 function tick(){if(identityEnabled&&identitySheets.vegeta&&fighter.classList.contains('atlas-fighter')){
  const ssj=fighter.classList.contains('transformed');let clip=ssj?'ssjIdle':'idle';
  if(fighter.classList.contains('powering'))clip='transform';else if(fighter.classList.contains('hit')||fighter.classList.contains('combo-receiving'))clip=ssj?'ssjIdle':'hurt';else if(fighter.classList.contains('punching'))clip=ssj?'ssjStrike':'strike';else if(fighter.classList.contains('firing'))clip=ssj?'ssjFire':'fire';else if(fighter.classList.contains('charging'))clip=ssj?'ssjCharge':'charge';else if(fighter.classList.contains('supporting'))clip=fighter.dataset.move==='guard'?'guard':fighter.dataset.move==='evade'?'evade':clip;else if(fighter.classList.contains('shielded'))clip=ssj?'ssjIdle':'guard';
  if(active!==clip){active=clip;started=animationClock.time;}const frames=identityFrames(clip),duration=frames.reduce((a,f)=>a+f[4],0),loop=['idle','charge','ssjIdle','ssjCharge','fire'].includes(clip);let elapsed=loop?(animationClock.time-started)%duration:Math.min(animationClock.time-started,duration-1),index=0;while(index<frames.length-1&&elapsed>=frames[index][4]){elapsed-=frames[index][4];index++;}ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;drawIdentityPose(ctx,identitySheets.vegeta,frames[index][0]);canvas.dataset.clip=clip;canvas.dataset.frame=String(index);canvas.dataset.source='identity-vegeta';
 }requestAnimationFrame(tick);}requestAnimationFrame(tick);
}
makeVegetaIdentityAnimator();
$('labStyle').onchange=()=>{identityEnabled=$('labStyle').value==='new';document.body.classList.toggle('pixel-identity',identityEnabled);reset();};
