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
let state=createGame(),generation=0,busy=false;const $=id=>document.getElementById(id);const types={'TÉCNICA':'technique','HABILIDADE':'ability','REAÇÃO':'reaction','TRANSFORMAÇÃO':'transformation'};
function hud(f,enemy){return `<div class="fighter-hud ${enemy?'enemy':''}"><div class="hud-name">${f.form==='gogetaSSJ'?'GOGETA':f.name.toUpperCase()}<small>${enemy?'OPONENTE · CPU':'VOCÊ · JOGADOR 01'}</small></div><div class="hp-label"><span>VIDA</span><b>${f.hp} <span>/ 100</span></b></div><div class="hp-track" role="progressbar" aria-label="Vida de ${f.name}" aria-valuenow="${f.hp}" aria-valuemin="0" aria-valuemax="100"><div class="hp-fill" style="width:${f.hp}%"></div></div><div class="ki-row"><span>KI</span>${Array.from({length:8},(_,i)=>`<i class="ki-cell ${i<f.ki?'filled':''}"></i>`).join('')}<b>${f.ki}/8</b></div><div class="status">${[f.shield?`◈ Escudo ${f.shield}`:'',f.reaction?'↯ Reação preparada':'',f.form==='gogetaSSJ'?'✦ Gogeta Super Sayajin':f.transformed?'✦ Super Saiyajin':''].filter(Boolean).join(' · ')||'Forma base · Pronto para o combate'}</div></div>`;}
function render(){ $('playerHud').innerHTML=hud(state.player,false);$('enemyHud').innerHTML=hud(state.enemy,true);$('round').textContent=`ROUND ${String(state.round).padStart(2,'0')}`;$('phase').textContent=state.winner?'FIM DO TREINO':state.turn==='player'?'SEU TURNO':'TURNO DA CPU';$('turnTitle').textContent=state.winner?'Treino concluído.':state.turn==='player'?'Sua vez de brilhar.':'Vegeta está planejando…';$('turnHint').textContent=state.turn==='player'?(state.actions?'Combine suas cartas. Encontre uma abertura.':'Suas ações acabaram. Encerre o turno para continuar.'):'Observe as técnicas do adversário e prepare sua resposta.';$('actions').innerHTML=`<b>${state.actions} / 2</b> AÇÕES`;$('endTurn').disabled=busy||state.turn!=='player'||!!state.winner;$('handCount').textContent=state.player.hand.length;$('deckCount').textContent=`▱ ${state.player.deck.length} NO BARALHO · ${state.player.discard.length} DESCARTE`;$('lastAction').textContent=state.log.at(-1);
$('hand').replaceChildren();(labMode&&isVisualEnemyActor()?[]:labMode?Object.keys(CARDS):state.player.hand).forEach((key,i)=>{const c=CARDS[key],button=document.createElement('button');button.className=`card ${types[c.type]}`;button.disabled=busy||(!labMode&&!canPlay(state,'player',i));button.setAttribute('aria-label',`${c.name}, ${c.cost} ki, ${c.actions||1} ações. ${c.description}`);button.innerHTML=`<div class="card-top"><span>${c.type}</span><b class="cost">${c.cost}</b></div><div class="card-art art-${key}"><span class="card-sprite"></span><span>${c.icon}</span></div><h3>${c.name}</h3><p>${c.description}</p><div class="card-stats"><span>${c.cost} KI</span><span>${c.actions||1} ${(c.actions||1)===1?'AÇÃO':'AÇÕES'}</span>${c.damage?`<span>${c.damage} DANO</span>`:''}</div><span class="card-foot">${labMode?(busy?'REPRODUZINDO':'TESTAR ANIMAÇÃO'):c.transform&&(c.form==='gogetaSSJ'?state.player.form==='gogetaSSJ':state.player.transformed)?'JÁ TRANSFORMADO':c.reaction&&state.player.reaction?'REAÇÃO JÁ PREPARADA':state.player.ki<c.cost?'KI INSUFICIENTE':state.actions<(c.actions||1)?'AÇÕES INSUFICIENTES':(c.actions===2?'02 AÇÕES · ':'01 AÇÃO · ')+(c.damage?'OFENSIVA':c.reaction?'PREPARAR':'SUPORTE')}</span>`;button.onclick=()=>labMode?runLab(key):execute('player',i);$('hand').append(button);});if(!state.player.hand.length)$('hand').innerHTML='<p class="empty">Sem cartas na mão. Encerre o turno para comprar mais.</p>';for(const [side,id]of [['player','goku'],['enemy','vegeta']]){ $(id).classList.toggle('transformed',state[side].transformed);$(id).querySelector('.fighter-name').innerHTML=`${state[side].form==='gogetaSSJ'?'GOGETA':state[side].name.toUpperCase()} <span>${side==='player'?'VOCÊ':'CPU'}</span>`;$(id).classList.toggle('shielded',state[side].shield>0);$(id).classList.toggle('reaction-ready',state[side].reaction>0); };$('logList').replaceChildren(...state.log.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));if(gokuAnimator)gokuAnimator.cards();paintGogetaCard();paintKienzanCard();if(burstArt.projectile)paintBurstCard();if(baseKameCardData)paintBaseKameCard();if(labMode)renderLab();}
async function execute(side,i){
 if(busy||!canPlay(state,side,i))return;
 const token=generation,key=state[side].hand[i],c=CARDS[key],target=side==='player'?'enemy':'player';
 const source=$(side==='player'?'goku':'vegeta'),dest=$(side==='player'?'vegeta':'goku');
 busy=true;source.dataset.move=key;render();
 const customID=customIdentity(side),studioEntry=customSprites?.[spriteKey(customID.character,customID.form,key)];if(studioEntry?.studio){await executeStudioAbility(side,i,token,studioEntry);return;}
 if(side==='player'&&key==='beam'&&!state.player.transformed){try{await baseKameReady;}catch{busy=false;clearBattleFx();render();$('lastAction').textContent='Não foi possível carregar a animação base.';return;}if(token!==generation)return;}
 if(key==='superBeam'){try{await superImpactReady;}catch{busy=false;clearBattleFx();render();$('lastAction').textContent='Não foi possível carregar a explosão do Super Kamehameha.';return;}if(token!==generation)return;}
 if(key==='kienzan'){await executeKienzan(side,i,token);return;}
 if(key==='gogeta'){await executeGogeta(side,i,token);return;}
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
 await delay(baseForm?BASE_KAME_FRAMES.slice(0,BASE_KAME_CHARGE_FRAMES).reduce((sum,f)=>sum+f[4],0):1440);if(token!==generation)return;
 source.classList.remove('gogeta-transform','four-blasts','super-kame','kame-preparing');source.classList.add('kame-firing');$('lastAction').textContent='Kame… hame… HA!';
 await delay(baseForm?BASE_KAME_FRAMES[BASE_KAME_CHARGE_FRAMES][4]:540);if(token!==generation)return;
 const beam=gokuAnimator.beam(superPower,baseForm);beam.className='battle-fx energy-beam original-beam'+(superPower?' super-kame-beam':'');document.querySelector('.battle').append(beam);
 await delay(220);if(token!==generation)return;
 const hp=state.enemy.hp;play(state,'player',index);render();if(superPower){dest.classList.add('hit');if(hp===state.enemy.hp)dest.classList.add('blocked');startSuperImpact(dest,token);}else dest.classList.add('hit',hp>state.enemy.hp?'impact':'blocked');
 $('effect').textContent=hp>state.enemy.hp?`−${hp-state.enemy.hp}`:'BLOQUEADO';$('effect').classList.remove('show');void $('effect').offsetWidth;$('effect').classList.add('show');
 await delay(superPower?800:480);if(token!==generation)return;beam.remove();dest.classList.remove('hit','impact','blocked');source.classList.remove('kame-firing');source.classList.add('kame-recovering');
 await delay(baseForm?BASE_KAME_FRAMES[BASE_KAME_CHARGE_FRAMES][4]:560);if(token!==generation)return;clearBattleFx();busy=false;render();
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
 source.classList.remove('punching');dest.classList.remove('gogeta-transform','four-blasts','super-kame','kame-preparing','kame-firing','kame-recovering','combo-receiving');await delay(140);if(token!==generation)return;
 motion.cancel();comboMotions.delete(motion);
 const back=animateGame(source,[{translate:`${travel}px 0px`},{translate:'0px 0px'}],{duration:260,easing:'ease-out',fill:'forwards'});comboMotions.add(back);
 await delay(260);if(token!==generation)return;back.cancel();comboMotions.delete(back);clearBattleFx();busy=false;render();
 if(state.winner&&!labMode){$('resultTitle').textContent=state.winner==='player'?'Você superou seus limites!':'Vegeta levou este round.';$('resultText').textContent=`Treino encerrado em ${state.round} rounds.`;$('resultDialog').showModal();}
}
function spawnKiBurst(){const projectile=gokuAnimator.blast();projectile.className='battle-fx energy-blast original-ki';document.querySelector('.battle').append(projectile);}
function clearBattleFx(){for(const id of ['goku','vegeta']){delete $(id).dataset.customClip;delete $(id).dataset.customStart;}document.querySelectorAll('.base-kame').forEach(e=>e.classList.remove('base-kame'));for(const animation of comboMotions)animation.cancel();comboMotions.clear();document.querySelectorAll('.battle-fx').forEach(e=>e.remove());for(const id of ['goku','vegeta'])$(id).classList.remove('kienzan-casting','gogeta-transform','four-blasts','super-kame','kame-preparing','kame-firing','kame-recovering','combo-receiving','combining','charging','firing','powering','punching','supporting','attacking','hit','impact','blocked');}
const delay=ms=>animationClock.wait(ms);$('endTurn').onclick=async()=>{if(busy||state.turn!=='player'||state.winner)return;const token=generation;endTurn(state);render();await delay(900);for(let n=0;n<2;n++){if(token!==generation||state.winner)return;const i=chooseEnemy(state);if(i<0)break;await execute('enemy',i);await delay(400);}if(token!==generation||state.winner)return;endTurn(state);render();};
function reset(){generation++;animationClock.cancelWaits();busy=false;clearBattleFx();state=createGame();if(labMode)prepareLabState();document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();} $('restart').onclick=reset;$('playAgain').onclick=reset;$('help').onclick=()=>$('helpDialog').showModal();$('logButton').onclick=()=>$('logDialog').showModal();document.querySelectorAll('.close,.close-help').forEach(b=>b.onclick=()=>b.closest('dialog').close());render();

function setSprite(id,src){const fighter=$(id);let img=fighter.querySelector('.sprite-img');if(!img){img=document.createElement('img');img.className='sprite-img';img.alt='';fighter.append(img);}img.src=src;fighter.classList.add('has-sprite');fighter.classList.remove('atlas-fighter');}
$('spriteButton').onclick=()=>$('spriteDialog').showModal();
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
 function paintCards(){if(!ready)return;const mapping={strike:'strike',beam:'ssjFire',superBeam:'ssjFire',charge:'charge',guard:'idle',evade:'evade',transform:'ssjIdle'};for(const [key,name]of Object.entries(mapping)){const el=document.querySelector('.art-'+key+' .card-sprite');if(el){el.style.backgroundImage='url("'+frameTexture(key==='superBeam'?[303,674,260,91,1]:GOKU_CLIPS[name][key==='beam'?0:key==='blast'?3:key==='strike'?6:0]).toDataURL()+'")';el.style.backgroundSize='contain';el.style.backgroundPosition='center';}}if(baseKameCardData)paintBaseKameCard();}
 function current(){if(preview)return preview;if(fighter.classList.contains('kienzan-casting')&&!state.player.transformed)return 'kienzanThrow';if(fighter.classList.contains('base-kame')){if(fighter.classList.contains('kame-preparing'))return 'baseKameCharge';if(fighter.classList.contains('kame-firing'))return 'baseKameFire';if(fighter.classList.contains('kame-recovering'))return 'baseKameRecover';}if(fighter.classList.contains('kame-preparing'))return 'kamePrepare';if(fighter.classList.contains('kame-firing'))return 'kameFire';if(fighter.classList.contains('kame-recovering'))return 'kameRecover';const ssj=fighter.classList.contains('transformed');if(fighter.classList.contains('four-blasts'))return ssj?'ssjFire':'rajadaFire';if(fighter.dataset.move==='blast'&&!ssj&&(fighter.classList.contains('charging')||fighter.classList.contains('firing')))return 'rajadaPrepare';if(fighter.classList.contains('hit')||fighter.classList.contains('combo-receiving'))return ssj?'ssjIdle':'hurt';if(fighter.classList.contains('powering'))return 'transform';if(fighter.classList.contains('firing'))return ssj?'ssjFire':'fire';if(fighter.classList.contains('punching'))return ssj?'ssjStrike':'strike';if(fighter.classList.contains('charging'))return ssj?'ssjCharge':fighter.dataset.move==='beam'?'beamCharge':'charge';return ssj?'ssjIdle':'idle';}
 function tick(){
  const t=animationClock.time;
  if(ready&&fighter.classList.contains('atlas-fighter')){
   const name=current();if(name!==active||(name==='idle'&&idleSheet&&canvas.dataset.source!=='idle-ase')||(name==='ssjIdle'&&ssjIdleSheet&&canvas.dataset.source!=='ssj-idle-ase')){active=name;started=t;}
   const kienzan=!!kienzanArt&&['kienzanThrow','kienzanDisc'].includes(name);const idle=idleSheet&&name==='idle';const ssjIdle=ssjIdleSheet&&name==='ssjIdle';const base=baseKameSheet&&name.startsWith('baseKame');const native=rajadaSheet&&['kiBurst','rajadaPrepare','rajadaFire'].includes(name);
   const frames=kienzan?(name==='kienzanDisc'?KIENZAN_DISC_FRAMES:KIENZAN_THROW_FRAMES):ssjIdle?SSJ_IDLE_FRAMES:idle?IDLE_FRAMES:base?(name==='baseKameCharge'?BASE_KAME_FRAMES.slice(0,BASE_KAME_CHARGE_FRAMES):name==='baseKameFire'?BASE_KAME_FRAMES.slice(BASE_KAME_CHARGE_FRAMES):name==='baseKameRecover'?BASE_KAME_FRAMES.slice(-1):BASE_KAME_FRAMES):native?(name==='rajadaPrepare'?RAJADA_FRAMES.slice(0,2):name==='rajadaFire'?RAJADA_FRAMES.slice(2):RAJADA_FRAMES):GOKU_CLIPS[name]||GOKU_CLIPS.idle;
   const duration=frames.reduce((a,f)=>a+f[4],0),loop=!!preview||['burstFire','idle','charge','beamCharge','ssjIdle','ssjCharge'].includes(name);let elapsed=loop?(t-started)%duration:Math.min(t-started,duration-1),frame=frames[0];
   if(name==='kienzanThrow'&&!preview)elapsed=Math.min(t-Number(fighter.dataset.kienzanStart||t),duration-1);
   for(const f of frames){frame=f;if(elapsed<f[4])break;elapsed-=f[4];}
   if(name==='rajadaFire'&&!preview)frame=frames[(Number(fighter.dataset.burstPose||0)%2)*2+(fighter.dataset.burstStage==='emit'?1:0)];
   const frameIndex=frames.indexOf(frame);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
   if(kienzan){const art=name==='kienzanDisc'?kienzanArt.disc:kienzanArt.throw,rect=art.metadata.frames[frame[0]],destH=224,destW=destH*rect.width/rect.height;ctx.drawImage(art.image,rect.x,rect.y,rect.width,rect.height,canvas.width/2-destW/2,canvas.height-18-destH,destW,destH);}
   else if(ssjIdle){const rect=ssjIdleMetadata.frames[frame[0]],destH=224,destW=destH*rect.width/rect.height;ctx.drawImage(ssjIdleSheet,rect.x,rect.y,rect.width,rect.height,canvas.width/2-destW/2,canvas.height-18-destH,destW,destH);}
   else if(idle){const rect=idleMetadata.frames[frame[0]],destH=224,destW=destH*rect.width/rect.height;ctx.drawImage(idleSheet,rect.x,rect.y,rect.width,rect.height,canvas.width/2-destW/2,canvas.height-18-destH,destW,destH);}
   else if(base){const rect=baseKameMetadata.frames[frame[0]],destH=224,destW=destH*rect.width/rect.height;ctx.drawImage(baseKameSheet,rect.x,rect.y,rect.width,rect.height,canvas.width/2-destW/2,canvas.height-18-destH,destW,destH);}
   else if(native){const [x,y,w,h,,anchor]=frame,z=256/180;ctx.drawImage(rajadaSheet,x,y,w,h,canvas.width/2-(anchor-x)*z,canvas.height-18-h*z,w*z,h*z);}
   else{const tex=frameTexture(frame),scale=sheet.naturalWidth/731,z=256/48/scale,anchor=(frame[5]===undefined?frame[2]/2:frame[5]-frame[0])*scale;ctx.drawImage(tex,canvas.width/2-anchor*z,canvas.height-18-tex.height*z,tex.width*z,tex.height*z);}
   const muzzleVisible=native&&(name==='rajadaFire'?frameIndex%2===1:name==='kiBurst'&&[3,5].includes(frameIndex));canvas.dataset.muzzle=muzzleVisible?'native-sheet':'none';canvas.dataset.clip=name;canvas.dataset.frame=String(frameIndex);canvas.dataset.source=kienzan?(name==='kienzanDisc'?'kienzan-disc-ase':'kienzan-throw-ase'):ssjIdle?'ssj-idle-ase':idle?'idle-ase':base?'base-kame-ase':native?'rajada-sheet':'goku-sheet';
   const pc=$('animationPreview');if(pc&&$('spriteDialog').open){const context=pc.getContext('2d');context.clearRect(0,0,pc.width,pc.height);context.imageSmoothingEnabled=false;context.drawImage(canvas,0,0);if(muzzleVisible&&burstArt.projectile){const shot=burstArt.projectile,h=42,w=h*shot.width/shot.height;context.drawImage(shot,390,canvas.height-18-21.5*256/48-h/2,w,h);}$('animationFrame').textContent=`Quadro ${frameIndex+1} / ${frames.length}`;}
  }requestAnimationFrame(tick);
 }

 sheet.onload=()=>{ready=true;paintCards();fighter.classList.add('original-sprites');$('spriteStatus').textContent='Goku usa os quadros da folha original. Vegeta mantém o atlas anterior.';};sheet.onerror=()=>{$('spriteStatus').textContent='Falha ao carregar a folha de Goku. O visual anterior foi mantido.';};requestAnimationFrame(tick);return {preview(name){preview=name;active='';},clear(){preview=null;active='';},cards:paintCards,blast(){const texture=frameTexture([185,540,31,36,1]),copy=document.createElement('canvas');copy.width=texture.width;copy.height=texture.height;copy.getContext('2d').drawImage(texture,0,0);return copy;},beam(superPower=false,baseForm=false){const texture=frameTexture([303,674,260,91,1]),copy=document.createElement('canvas');const arena=document.querySelector('.battle').getBoundingClientRect(),source=$('goku').getBoundingClientRect(),target=$('vegeta').getBoundingClientRect();const left=source.left-arena.left+source.width/2+(baseForm?36:32),width=Math.max(130,target.left-arena.left+target.width/2+22-left),height=superPower?BEAM_HEIGHT.super:BEAM_HEIGHT.normal;copy.width=Math.round(width*2);copy.height=height*2;copy.style.left=left+'px';copy.style.top=(source.top-arena.top+(baseForm?93:68)-height/2)+'px';copy.style.width=width+'px';copy.style.height=height+'px';const c=copy.getContext('2d');c.imageSmoothingEnabled=false;const cap=texture.width*.28,outCap=Math.min(copy.width*.35,cap/texture.height*copy.height);c.drawImage(texture,0,0,cap,texture.height,0,0,outCap,copy.height);c.drawImage(texture,cap,0,texture.width-2*cap,texture.height,outCap,0,copy.width-2*outCap,copy.height);c.drawImage(texture,texture.width-cap,0,cap,texture.height,copy.width-outCap,0,outCap,copy.height);return copy;},ready:()=>ready};
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
 const side=$('labActor').value,target=side==='player'?'enemy':'player';state.turn=side;state.actions=2;state.winner=null;state.player.hand=Object.keys(CARDS);state.enemy.hand=Object.keys(CARDS);state.player.ki=8;state.enemy.ki=8;
 state.player.name=$('labPlayer').value==='gogeta'?'Gogeta':'Goku';state.player.form=$('labPlayer').value==='gogeta'?'gogetaSSJ':$('labForm').value==='ssj'?'ssj':null;state.player.transformed=!!state.player.form;
 state.enemy.name=({saibaman:'Saibaman',cell:'Cell Perfeito',vegeta:'Vegeta'})[$('labOpponent').value];state.enemy.form=$('labOpponent').value==='vegeta'&&$('labEnemyForm').value==='ssj'?'ssj':null;state.enemy.transformed=!!state.enemy.form;
 const defense=$('labDefense').value;state[target].shield=defense==='shield'?18:0;state[target].reaction=defense==='reaction'?15:0;
}
function renderLab(){
 $('round').textContent='LAB';$('handCount').textContent=Object.keys(CARDS).length;$('phase').textContent=busy?'ANIMAÇÃO EM CURSO':'TESTE LIVRE';$('turnTitle').textContent='Todas as cartas. Sem esperar turnos.';$('turnHint').textContent='Clique em uma carta ou use Reproduzir. O alvo é restaurado a cada teste.';$('actions').textContent='TESTE LIVRE';$('deckCount').textContent=`${Object.keys(CARDS).length} CARTAS DISPONÍVEIS`;$('labPlay').disabled=busy;$('labSkill').disabled=busy;$('labEnemySkill').disabled=busy;$('labPlayer').disabled=busy;$('labEnemyForm').disabled=busy||['saibaman','cell'].includes($('labOpponent').value);$('labActor').disabled=busy;$('labOpponent').disabled=busy;$('labForm').disabled=busy||$('labPlayer').value==='gogeta';$('labDefense').disabled=busy;
 if(isVisualEnemyActor()){$('turnTitle').textContent=state.enemy.name+' · animações do inimigo';$('turnHint').textContent='Selecione uma animação no laboratório e clique em Reproduzir.';$('handCount').textContent='0';$('deckCount').textContent='SEM CARTAS · TESTE VISUAL';$('labDefense').disabled=true;document.querySelector('.lab-note').textContent='Selecione a animação do inimigo acima. Use pausa, avanço por quadro e velocidade para inspecionar.';}else document.querySelector('.lab-note').textContent='Use as cartas abaixo para testar diretamente. Os controles alteram somente a reprodução.';
 $('labPause').textContent=animationClock.paused?'▶ Continuar':'Ⅱ Pausar';$('labStatus').textContent=animationClock.paused?'Pausado · use avanço para inspecionar':busy?'Reproduzindo…':'Pronto para testar';
}
function toggleLab(enabled){
 labMode=enabled;document.body.classList.toggle('lab-mode',enabled);$('labPanel').hidden=!enabled;animationClock.paused=false;animationClock.speed=enabled?Number($('labSpeed').value):1;
 try{history.replaceState(null,'',location.href.split('#')[0]+(enabled?'#lab':''));}catch{}if(!enabled)$('labRepeat').checked=false;
 if(enabled)updateLabSkills();reset();$('labToggle').textContent=enabled?'Voltar à partida':'Laboratório de animações';
}
async function runLab(key=currentLabSkill()){
 if($('labActor').value==='enemy'&&$('labOpponent').value==='cell')return runCellLab(key);
 if(isSaibamanActor())return runSaibamanLab(key);
 if(!labMode||busy)return;animationClock.paused=false;$($('labActor').value==='player'?'labSkill':'labEnemySkill').value=key;generation++;animationClock.cancelWaits();clearBattleFx();state=createGame();prepareLabState();const side=$('labActor').value;
 if(CARDS[key].transform){state[side].transformed=false;state[side].form=null;}const token=generation;const index=state[side].hand.indexOf(key);gokuAnimator?.clear();render();
 try{await execute(side,index);}catch(error){if(token!==generation)return;clearBattleFx();busy=false;render();$('labStatus').textContent='Erro ao reproduzir. Confira o histórico.';console.error(error);return;}
 if(token!==generation||!labMode)return;state.player.hand=Object.keys(CARDS);state.enemy.hand=Object.keys(CARDS);state.player.ki=8;state.enemy.ki=8;state.actions=2;render();
 if($('labRepeat').checked){await delay(600);if(token===generation&&labMode&&$('labRepeat').checked)runLab(key);}
}
$('labSkill').replaceChildren(...Object.entries(CARDS).map(([key,card])=>{const option=document.createElement('option');option.value=key;option.textContent=card.name;return option;}));
$('labToggle').onclick=()=>toggleLab(!labMode);$('labExit').onclick=()=>toggleLab(false);$('labPlay').onclick=()=>runLab();$('labPause').onclick=()=>{animationClock.paused=!animationClock.paused;renderLab();};$('labStep').onclick=()=>{animationClock.step();renderLab();};$('labReset').onclick=()=>{animationClock.paused=false;reset();};$('labSpeed').onchange=()=>{animationClock.speed=Number($('labSpeed').value);};
for(const id of ['labActor','labPlayer','labOpponent','labForm','labEnemyForm','labDefense'])$(id).onchange=()=>{if(id==='labPlayer'&&$('labPlayer').value==='gogeta')$('labForm').value='ssj';if(id==='labOpponent'&&['saibaman','cell'].includes($('labOpponent').value))$('labEnemyForm').value='base';if(id==='labOpponent')updateLabSkills();reset();};


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

// Quadros e tempos exportados sem redesenho do arquivo Kamehameha.ase.
var baseKameSheet,baseKameMetadata,baseKameCardData;
const BASE_KAME_CHARGE_FRAMES=6;
var BASE_KAME_FRAMES=[];
const baseKameReady=(async()=>{
 const image=new Image();image.src='/assets/base-kame-ase.png';
 const [,metadata]=await Promise.all([image.decode(),fetch('/assets/base-kame-ase.json').then(response=>{if(!response.ok)throw new Error('Falha ao carregar os tempos do Kamehameha');return response.json();})]);
 if(metadata.frames.length<=BASE_KAME_CHARGE_FRAMES)throw new Error('A sequência precisa de quadros de carga e disparo');
 baseKameMetadata=metadata;BASE_KAME_FRAMES=metadata.frames.map((frame,index)=>[index,0,0,0,frame.duration]);baseKameSheet=image;
 const frame=metadata.frames.at(-1),c=document.createElement('canvas');c.width=frame.width;c.height=frame.height;c.getContext('2d').drawImage(image,frame.x,frame.y,frame.width,frame.height,0,0,frame.width,frame.height);baseKameCardData=c.toDataURL();paintBaseKameCard();const option=document.querySelector('#animationSelect option[value=baseKameAll]');if(option)option.textContent=`Kamehameha base · Aseprite (${metadata.frames.length} quadros)`;
})();
function paintBaseKameCard(){const art=document.querySelector('.art-beam .card-sprite');if(art&&baseKameCardData){art.style.backgroundImage='url("'+baseKameCardData+'")';art.style.backgroundSize='contain';art.style.backgroundPosition='center';}}

// Postura base: quadros e duração do Idle.ase fornecido pelo usuário.
var idleSheet,idleMetadata;
var IDLE_FRAMES=[];
const idleReady=(async()=>{
 const image=new Image();image.src='/assets/goku-idle-ase.png';
 const [,metadata]=await Promise.all([image.decode(),fetch('/assets/goku-idle-ase.json').then(response=>{if(!response.ok)throw new Error('Falha ao carregar os tempos da postura');return response.json();})]);
 if(!metadata.frames.length)throw new Error('A animação de postura está vazia');idleMetadata=metadata;IDLE_FRAMES=metadata.frames.map((frame,index)=>[index,0,0,0,frame.duration]);idleSheet=image;
 const option=document.querySelector('#animationSelect option[value=idle]');if(option)option.textContent=`Postura · Idle.ase (${metadata.frames.length} quadros)`;
})();

// Postura enquanto Goku está transformado: arquivo original Idle SSJ.ase.
var ssjIdleSheet,ssjIdleMetadata;
var SSJ_IDLE_FRAMES=[];
const ssjIdleReady=(async()=>{
 const image=new Image();image.src='/assets/goku-ssj-idle-ase.png';
 const [,metadata]=await Promise.all([image.decode(),fetch('/assets/goku-ssj-idle-ase.json').then(response=>{if(!response.ok)throw new Error('Falha ao carregar os tempos da postura SSJ');return response.json();})]);
 if(!metadata.frames.length)throw new Error('A postura SSJ está vazia');ssjIdleMetadata=metadata;SSJ_IDLE_FRAMES=metadata.frames.map((frame,index)=>[index,0,0,0,frame.duration]);ssjIdleSheet=image;
 const option=document.querySelector('#animationSelect option[value=ssjIdle]');if(option)option.textContent=`Postura SSJ · Idle SSJ.ase (${metadata.frames.length} quadros)`;
})();


// Folha original de Gogeta: nove poses, com pivôs e pés alinhados na exportação.
var gogetaSheet,gogetaMetadata,gogetaCardData;
const gogetaReady=(async()=>{
 const image=new Image();image.src='/assets/gogeta-transform.png';
 const [,metadata]=await Promise.all([image.decode(),fetch('/assets/gogeta-transform.json').then(r=>{if(!r.ok)throw new Error('Falha ao carregar Gogeta');return r.json();})]);
 gogetaMetadata=metadata;gogetaSheet=image;
 const f=metadata.frames.at(-1),card=document.createElement('canvas');card.width=180;card.height=240;
 card.getContext('2d').drawImage(image,f.x+100,120,180,240,0,0,180,240);gogetaCardData=card.toDataURL();paintGogetaCard();
})();
function paintGogetaCard(){const art=document.querySelector('.art-gogeta .card-sprite');if(art&&gogetaCardData){art.style.backgroundImage='url("'+gogetaCardData+'")';art.style.backgroundSize='contain';art.style.backgroundPosition='center';}}
async function executeGogeta(side,index,token){
 const source=$(side==='player'?'goku':'vegeta');
 try{await gogetaReady;}catch{if(token!==generation)return;busy=false;render();$('lastAction').textContent='Não foi possível carregar a transformação de Gogeta.';return;}
 if(token!==generation)return;source.dataset.gogetaStart=String(animationClock.time);source.classList.add('gogeta-transform');
 $('lastAction').textContent='Gogeta concentra energia… Super Sayajin!';
 await delay(gogetaMetadata.frames.reduce((sum,f)=>sum+f.duration,0));if(token!==generation)return;
 play(state,side,index);source.classList.remove('gogeta-transform');render();
 $('effect').textContent='GOGETA SUPER SAYAJIN';$('effect').classList.remove('show');void $('effect').offsetWidth;$('effect').classList.add('show');
 await delay(350);if(token!==generation)return;clearBattleFx();busy=false;render();
}
function makeGogetaAnimator(side){
 const fighter=$(side==='player'?'goku':'vegeta'),canvas=document.createElement('canvas');canvas.className='gogeta-frames';canvas.width=384;canvas.height=336;canvas.setAttribute('aria-hidden','true');fighter.append(canvas);
 const ctx=canvas.getContext('2d');let previewStart=0,wasPreview=false;
 function tick(){
  const preview=side==='player'&&$('spriteDialog').open&&$('animationSelect').value==='gogetaTransform';
  if(preview&&!wasPreview)previewStart=animationClock.time;wasPreview=preview;
  const transforming=fighter.classList.contains('gogeta-transform'),visible=!!gogetaSheet&&(preview||transforming||state[side].form==='gogetaSSJ');fighter.classList.toggle('gogeta-visible',visible);
  if(visible){
   const frames=gogetaMetadata.frames,duration=frames.reduce((n,f)=>n+f.duration,0);let elapsed=preview?(animationClock.time-previewStart)%duration:animationClock.time-Number(fighter.dataset.gogetaStart||0),index=frames.length-1;
   if(preview||transforming){for(let i=0;i<frames.length;i++){if(elapsed<frames[i].duration){index=i;break;}elapsed-=frames[i].duration;}}
   const f=frames[index],z=.85,w=f.width*z,h=f.height*z;ctx.clearRect(0,0,384,336);ctx.imageSmoothingEnabled=false;
   ctx.drawImage(gogetaSheet,f.x,f.y,f.width,f.height,192-w/2,318-350*z,w,h);
   canvas.dataset.source='gogeta-sheet';canvas.dataset.clip=preview||transforming?'gogetaTransform':'gogetaIdle';canvas.dataset.frame=String(index);
   if(preview){const c=$('animationPreview').getContext('2d');c.clearRect(0,0,448,336);c.drawImage(canvas,0,0);$('animationFrame').textContent=`Quadro ${index+1} / ${frames.length}`;}
  }requestAnimationFrame(tick);
 }requestAnimationFrame(tick);
}
makeGogetaAnimator('player');makeGogetaAnimator('enemy');


// Animações exportadas sem alteração dos quadros e tempos dos dois .ase enviados.
var kienzanArt,kienzanCardData;
var KIENZAN_THROW_FRAMES=[],KIENZAN_DISC_FRAMES=[];
const kienzanReady=(async()=>{
 async function load(png,json){const image=new Image();image.src=png;const [,metadata]=await Promise.all([image.decode(),fetch(json).then(r=>{if(!r.ok)throw new Error('Falha ao carregar Kienzan');return r.json();})]);if(!metadata.frames.length)throw new Error('Animação Kienzan vazia');return {image,metadata};}
 const [disc,throwArt]=await Promise.all([load('/assets/kienzan-disc.png','/assets/kienzan-disc.json'),load('/assets/kienzan-throw.png','/assets/kienzan-throw.json')]);
 KIENZAN_THROW_FRAMES=throwArt.metadata.frames.map((f,i)=>[i,0,0,0,f.duration]);KIENZAN_DISC_FRAMES=disc.metadata.frames.map((f,i)=>[i,0,0,0,f.duration]);kienzanArt={disc,throw:throwArt};
 const f=throwArt.metadata.frames[4],card=document.createElement('canvas');card.width=f.width;card.height=f.height;card.getContext('2d').drawImage(throwArt.image,f.x,f.y,f.width,f.height,0,0,f.width,f.height);kienzanCardData=card.toDataURL();paintKienzanCard();
})();
function paintKienzanCard(){const art=document.querySelector('.art-kienzan .card-sprite');if(art&&kienzanCardData){art.style.backgroundImage='url("'+kienzanCardData+'")';art.style.backgroundSize='contain';art.style.backgroundPosition='center';}}
function spawnKienzanDisc(side,token,from,to,flightTime=0){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;canvas.className='battle-fx kienzan-disc';canvas.dataset.phase=flightTime?'flight':'held';canvas.style.transform=side==='enemy'?'scaleX(-1)':'';document.querySelector('.battle').append(canvas);
 const ctx=canvas.getContext('2d'),start=animationClock.time,art=kienzanArt.disc,frames=art.metadata.frames,cycle=frames.reduce((n,f)=>n+f.duration,0);
 function tick(){if(token!==generation||!canvas.isConnected){canvas.remove();return;}const elapsed=animationClock.time-start,progress=flightTime?Math.min(1,elapsed/flightTime):0;canvas.style.left=(from.x+(to.x-from.x)*progress-64)+'px';canvas.style.top=(from.y+(to.y-from.y)*progress-64)+'px';let time=elapsed%cycle,index=0;while(index<frames.length-1&&time>=frames[index].duration){time-=frames[index].duration;index++;}const f=frames[index];ctx.clearRect(0,0,128,128);ctx.imageSmoothingEnabled=false;ctx.drawImage(art.image,f.x,f.y,f.width,f.height,0,0,128,128);canvas.dataset.frame=String(index);requestAnimationFrame(tick);}
 tick();return canvas;
}
async function executeKienzan(side,index,token){
 const source=$(side==='player'?'goku':'vegeta'),dest=$(side==='player'?'vegeta':'goku'),target=side==='player'?'enemy':'player',direction=side==='player'?1:-1;
 try{await kienzanReady;}catch{if(token!==generation)return;clearBattleFx();busy=false;render();$('lastAction').textContent='Não foi possível carregar as animações do Kienzan.';return;}if(token!==generation)return;
 const native=side==='player'&&!state.player.transformed,arena=document.querySelector('.battle').getBoundingClientRect(),a=source.getBoundingClientRect(),b=dest.getBoundingClientRect(),center=a.left-arena.left+a.width/2;
 const overhead={x:center,y:a.top-arena.top-12},start={x:center+direction*42,y:a.top-arena.top+55},end={x:b.left-arena.left+b.width/2,y:b.top-arena.top+68},shots=CARDS.kienzan.projectiles;
 const preparation=kienzanArt.throw.metadata.frames.slice(0,6).reduce((n,f)=>n+f.duration,0);
 for(let shot=0;shot<shots;shot++){
  // Reinicia os nove quadros: preparação, disco sobre a cabeça e arremesso.
  source.dataset.kienzanShot=String(shot+1);source.dataset.kienzanStart=String(animationClock.time);source.classList.remove('firing');source.classList.add('kienzan-casting','charging');
  $('lastAction').textContent=`Formando o Kienzan ${shot+1}/${shots}…`;
  const held=native?null:spawnKienzanDisc(side,token,overhead,overhead);
  await delay(preparation);if(token!==generation)return;
  held?.remove();source.classList.remove('charging');source.classList.add('firing');$('lastAction').textContent=`Kienzan! Disco ${shot+1}/${shots}.`;
  const disc=spawnKienzanDisc(side,token,start,end,380);disc.dataset.shot=String(shot+1);
  await delay(380);if(token!==generation)return;disc.remove();
  let damage=0;
  // A carta continua sendo um ataque de 40 de dano, cobrado uma única vez.
  if(shot===shots-1){const hp=state[target].hp;play(state,side,index);render();damage=hp-state[target].hp;}
  const blocked=shot===shots-1?!damage:state[target].shield+state[target].reaction>0;dest.classList.add('hit',blocked?'blocked':'impact');
  const spark=document.createElement('div');spark.className='battle-fx contact-spark'+(blocked?' guarded':'');spark.style.left=end.x+'px';spark.style.top=end.y+'px';document.querySelector('.battle').append(spark);spark.addEventListener('animationend',()=>spark.remove(),{once:true});
  $('effect').textContent=`${shot+1}/${shots} · ${shot===shots-1?(damage?'−'+damage:'BLOQUEADO'):'KIENZAN'}`;$('effect').classList.remove('show');void $('effect').offsetWidth;$('effect').classList.add('show');
  await delay(140);if(token!==generation)return;dest.classList.remove('hit','impact','blocked');
 }
 clearBattleFx();busy=false;render();
 if(state.winner&&!labMode){$('resultTitle').textContent=state.winner==='player'?'Você superou seus limites!':'Vegeta levou este round.';$('resultText').textContent=`Treino encerrado em ${state.round} rounds.`;$('resultDialog').showModal();}
}

// Nomes interpretados visualmente; o pacote original só numera as imagens.
const SAIBA_CLIPS={
 idle:{name:'Postura / Idle',frames:[1],ms:900},
 crawl:{name:'Rastejar',frames:[2,3,2,3],ms:120,move:true},
 dash:{name:'Avanço rápido',frames:[3,7,3,7,3],ms:100,move:true},
 jump:{name:'Salto e aterrissagem',frames:[4,5,6,8,5,4,1],ms:120,jump:true},
 punch:{name:'Soco',frames:[9,10,9,10,1],ms:130,contact:true},
 kick:{name:'Combo de chutes',frames:[11,12,13,14,1],ms:140,contact:true},
 claws:{name:'Golpes de garra',frames:[15,16,17,1],ms:150,contact:true},
 evade:{name:'Esquiva',frames:[18,19,18,1],ms:140},
 hurt:{name:'Receber golpes',frames:[20,21,22,23,24,1],ms:130},
 fall:{name:'Queda / nocaute',frames:[22,24,25,25,1],ms:180},
 ki:{name:'Disparo de ki',frames:[26,27,26,27,1],ms:150,projectile:true},
 charge:{name:'Carregar ki com aura',frames:[30,31,32,31,30,32],ms:150},
 beam:{name:'Raio de energia',frames:[33,34,35,35,1],ms:180,beam:true},
 acid:{name:'Jato de ácido',frames:[37,38,39,40,37,1],ms:160,acid:true},
 explode:{name:'Autodestruição e fumaça',frames:[41,42,43,44,46,45,45],ms:170,explode:true},
 kiFx:{name:'Efeito · projétil de ki',frames:[28,29,28,29],ms:150,fx:true},
 beamFx:{name:'Efeito · raio de energia',frames:[36],ms:900,fx:true},
 explosionFx:{name:'Efeito · explosão e fumaça',frames:[46,45,45],ms:220,fx:true}
};
var saibaArt,saibaFrames,saibaPlayback=null;
const saibaReady=(async()=>{const im=new Image();im.src='/assets/saibaman-atlas.png';const [,frames]=await Promise.all([im.decode(),fetch('/assets/saibaman-atlas.json').then(r=>{if(!r.ok)throw Error('Falha ao carregar Saibaman');return r.json();})]);saibaArt=im;saibaFrames=frames;})();
function currentLabSkill(){return $($('labActor').value==='player'?'labSkill':'labEnemySkill').value;}
function updateLabSkills(){for(const [id,entries]of [['labSkill',CARDS],['labEnemySkill',enemyClips($('labOpponent').value)||CARDS]]){const previous=$(id).value;$(id).replaceChildren(...Object.entries(entries).map(([key,c])=>{const o=document.createElement('option');o.value=key;o.textContent=c.name;return o;}));if(entries[previous])$(id).value=previous;}}
function drawSaiba(ctx,n,x,y,scale=4.5){const f=saibaFrames[n];ctx.imageSmoothingEnabled=false;ctx.drawImage(saibaArt,f.x,f.y,f.w,f.h,x-f.pivot*scale,y-f.h*scale,f.w*scale,f.h*scale);}
const saibaCanvas=document.createElement('canvas');saibaCanvas.className='saibaman-frames';saibaCanvas.width=768;saibaCanvas.height=512;$('vegeta').append(saibaCanvas);
function saibaTick(){
 const visible=labMode&&$('labOpponent').value==='saibaman'&&!!saibaArt;$('vegeta').classList.toggle('saibaman-visible',visible);document.body.classList.toggle('saibaman-lab',visible&&isSaibamanActor());
 if(visible){const p=saibaPlayback&&saibaPlayback.token===generation?saibaPlayback:null,c=p?SAIBA_CLIPS[p.key]:SAIBA_CLIPS.idle,index=p?Math.min(c.frames.length-1,Math.floor((animationClock.time-p.start)/c.ms)):0,n=c.frames[index];const ctx=saibaCanvas.getContext('2d');ctx.clearRect(0,0,768,512);ctx.save();ctx.translate(768,0);ctx.scale(-1,1);
 const z=n===36?3.5:[30,31,32].includes(n)?5.8:4.5;drawSaiba(ctx,n,384,494+(!p||p.key==='idle'?Math.sin(animationClock.time/250)*1.2:0),z);ctx.restore();saibaCanvas.dataset.frame=String(n);saibaCanvas.dataset.clip=p?p.key:'idle';saibaCanvas.dataset.facing='left';
 }requestAnimationFrame(saibaTick);
}requestAnimationFrame(saibaTick);
function saibaEffect(n,from,to,duration,token){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;canvas.className='battle-fx saibaman-effect';document.querySelector('.battle').append(canvas);const start=animationClock.time;
 function tick(){if(token!==generation||!canvas.isConnected){canvas.remove();return;}const t=Math.min(1,(animationClock.time-start)/duration);canvas.style.left=(from.x+(to.x-from.x)*t-64)+'px';canvas.style.top=(from.y+(to.y-from.y)*t-32)+'px';const ctx=canvas.getContext('2d');ctx.clearRect(0,0,256,128);ctx.save();ctx.translate(256,0);ctx.scale(-1,1);const f=saibaFrames[n===28?(Math.floor((animationClock.time-start)/100)%2?29:28):n];ctx.imageSmoothingEnabled=false;ctx.drawImage(saibaArt,f.x,f.y,f.w,f.h,0,0,256,128);ctx.restore();if(t<1)requestAnimationFrame(tick);}
 tick();return canvas;
}
async function runSaibamanLab(key){
 if(!labMode||busy||!SAIBA_CLIPS[key])return;animationClock.paused=false;generation++;animationClock.cancelWaits();clearBattleFx();state=createGame();prepareLabState();const token=generation,c=SAIBA_CLIPS[key];busy=true;render();
 try{
 await saibaReady;if(token!==generation)return;const customEntry=customSprites?.[spriteKey('saibaman','base',key)];if(customEntry?.studio){await playStudioVisual('enemy',key,token,customEntry);if(token!==generation)return;clearBattleFx();busy=false;render();if($('labRepeat').checked){await delay(600);if(token===generation)runSaibamanLab(key);}return;}const actor=$('vegeta'),target=$('goku');const stage=document.querySelector('.battle').getBoundingClientRect(),a=actor.getBoundingClientRect(),b=target.getBoundingClientRect();let movement;
 if(c.contact||c.move||c.explode||c.acid){const gap=c.acid?230:75,travel=b.left+b.width/2+gap-(a.left+a.width/2);movement=animateGame(actor,[{translate:'0px 0px'},{translate:travel+'px 0px'}],{duration:240,fill:'forwards',easing:'ease-out'});comboMotions.add(movement);await delay(240);if(token!==generation)return;}
 if(c.jump){movement=animateGame(actor,[{translate:'0px 0px'},{translate:'0px -85px',offset:.5},{translate:'0px 0px'}],{duration:c.frames.length*c.ms});comboMotions.add(movement);}
 saibaPlayback={key,start:animationClock.time,token};
 for(let i=0;i<c.frames.length;i++){
  if(token!==generation)return;
  if((c.contact&&i>0&&i<c.frames.length-1)||(c.acid&&i===3)||(c.explode&&i===4)){const r=target.getBoundingClientRect(),spark=document.createElement('div');spark.className='battle-fx contact-spark';spark.style.left=(r.left-stage.left+r.width/2)+'px';spark.style.top=(r.top-stage.top+68)+'px';document.querySelector('.battle').append(spark);spark.addEventListener('animationend',()=>spark.remove(),{once:true});target.classList.remove('hit');void target.offsetWidth;target.classList.add('hit');}
  if((c.projectile&&i===1)||(c.beam&&i===2)){const from={x:a.left-stage.left+a.width/2-40,y:a.top-stage.top+68},to={x:b.left-stage.left+b.width/2,y:b.top-stage.top+68};const fx=saibaEffect(c.beam?36:28,from,to,c.ms,token);await delay(c.ms);if(token!==generation)return;fx.remove();target.classList.add('hit');}else await delay(c.ms);
 }
 if(token!==generation)return;saibaPlayback=null;if(movement){movement.cancel();comboMotions.delete(movement);}clearBattleFx();busy=false;render();$('labStatus').textContent='Animação concluída · sem consumo de cartas';
 if($('labRepeat').checked){await delay(600);if(token===generation&&labMode)runSaibamanLab(key);}
 }catch(error){if(token!==generation)return;saibaPlayback=null;clearBattleFx();busy=false;render();$('labStatus').textContent='Não foi possível carregar Saibaman.';console.error(error);}
}

function isSaibamanActor(){return $('labActor').value==='enemy'&&$('labOpponent').value==='saibaman';}
// Cell Perfeito: original poses face right; rendering mirrors the enemy once.
const CELL_CLIPS={
 idle:{name:'Postura / Idle',frames:['004','005','004','006'],ms:260},
 walk:{name:'Passos / deslocamento',frames:['002','003','004','005'],ms:160,move:true},
 dash:{name:'Avanço rápido',frames:['011','012','013','014','015','017','018'],ms:100,move:true},
 jump:{name:'Salto e aterrissagem',frames:['021','022','023','024','025','026','027'],ms:140,jump:true},
 punch:{name:'Combo de socos',frames:['031','032','033','034','035','036','037','038','039'],ms:110,contact:true},
 kick:{name:'Combo de chutes',frames:['040','041','042','043','044','045','046','047','048','049'],ms:110,contact:true},
 strike:{name:'Golpes aéreos',frames:['050','051','052','053','054','055','056','057','058','059','060','061'],ms:120,contact:true},
 evade:{name:'Esquiva / teletransporte',frames:['018','019','020','019','018'],ms:120},
 hurt:{name:'Receber golpes',frames:['062','063','064','065'],ms:160},
 fall:{name:'Queda / nocaute',frames:['062','064','065','066','067'],ms:200},
 ki:{name:'Disparo de ki',frames:['068','069','069','068'],ms:180,shot:'073',release:1},
 charge:{name:'Carregar ki / aura',frames:['076','077','078','079','080','081','082','083','084'],ms:160},
 barrier:{name:'Barreira de energia',frames:['084','085','086','087','087','086','084'],ms:180},
 kienzan:{name:'Kienzan duplo',frames:['106','107','108','109','110','111','112','113'],ms:180,shot:'114',release:5},
 groundBlast:{name:'Explosão de energia no chão',frames:['118','119','120','120','118'],ms:180,ground:true},
 regenerate:{name:'Regeneração / energia',frames:['125','126','127','128','129','130','131','132','133','134','135'],ms:160},
 makankosappo:{name:'Makankosappo',frames:Array.from({length:9},(_,i)=>'cast'+i),release:8,shot:'projectile',beam:true,impact:true},
 kamehameha:{name:'Kamehameha',frames:['143','144','145','146','147','148','149','150','151','152'],ms:180,release:8,shot:'153',beam:true},
 taunt:{name:'Provocação',frames:['154','155','156','157','156','155'],ms:200},
 retreat:{name:'Recuo / desaparecimento',frames:['158','159','160','161','162','163'],ms:150,move:true},
 kiFx:{name:'Efeito · energia / projétil',frames:['070','071','072','073','074'],ms:160,fx:true},
 explosionFx:{name:'Efeito · explosão Makankosappo',frames:['impact0','impact1','impact2'],fx:true},
 projectileFx:{name:'Efeito · raio Makankosappo',frames:['projectile'],ms:900,fx:true}
};
var cellArt,cellFrames,cellPlayback=null;
const cellReady=(async()=>{const im=new Image();im.src='/assets/cell-atlas.png';const [,frames]=await Promise.all([im.decode(),fetch('/assets/cell-atlas.json').then(r=>{if(!r.ok)throw Error('Falha ao carregar Cell');return r.json();})]);cellArt=im;cellFrames=frames;})();
function enemyClips(character){return character==='cell'?CELL_CLIPS:character==='saibaman'?SAIBA_CLIPS:null;}
function isVisualEnemyActor(){return $('labActor').value==='enemy'&&['saibaman','cell'].includes($('labOpponent').value);}
const cellCanvas=document.createElement('canvas');cellCanvas.className='cell-frames';cellCanvas.width=384;cellCanvas.height=336;$('vegeta').append(cellCanvas);
function drawCell(ctx,id,x,y,z=1.2){const f=cellFrames[id];ctx.imageSmoothingEnabled=false;ctx.drawImage(cellArt,f.x,f.y,f.w,f.h,x-f.pivotX*z,y-f.pivotY*z,f.w*z,f.h*z);}
function cellDuration(c,id){return c.ms||cellFrames[id].duration;}
function cellTick(){
 const visible=labMode&&$('labOpponent').value==='cell'&&!!cellArt;const actor=$('vegeta');actor.classList.toggle('cell-visible',visible);document.body.classList.toggle('visual-enemy-lab',labMode&&isVisualEnemyActor());
 if(visible){const p=cellPlayback?.token===generation?cellPlayback:null,key=p?p.key:actor.classList.contains('hit')?'hurt':'idle',c=CELL_CLIPS[key];let elapsed=p?animationClock.time-p.start:animationClock.time;const total=c.frames.reduce((sum,id)=>sum+cellDuration(c,id),0);if(!p)elapsed%=total;let index=0;while(index<c.frames.length-1&&elapsed>=cellDuration(c,c.frames[index]))elapsed-=cellDuration(c,c.frames[index++]);const ctx=cellCanvas.getContext('2d');ctx.clearRect(0,0,384,336);ctx.save();ctx.translate(384,0);ctx.scale(-1,1);drawCell(ctx,c.frames[index],192,c.fx?200:318);ctx.restore();cellCanvas.dataset.frame=c.frames[index];cellCanvas.dataset.clip=key;cellCanvas.dataset.facing='left';}
 requestAnimationFrame(cellTick);
}requestAnimationFrame(cellTick);
function cellHit(target,stage){target.classList.remove('hit');void target.offsetWidth;target.classList.add('hit');const r=target.getBoundingClientRect(),spark=document.createElement('div');spark.className='battle-fx contact-spark';spark.style.left=(r.left-stage.left+r.width/2)+'px';spark.style.top=(r.top-stage.top+r.height*.4)+'px';document.querySelector('.battle').append(spark);spark.addEventListener('animationend',()=>spark.remove(),{once:true});}
// Effects use the shared animation clock, so pause, speed and reset stay in sync.
function cellEffect(ids,from,to,duration,token,{beam=false,width=100,height=28}={}){
 const canvas=document.createElement('canvas');canvas.className='battle-fx cell-effect';canvas.width=Math.ceil(beam?Math.abs(to.x-from.x):width);canvas.height=height;canvas.style.width=canvas.width+'px';canvas.style.height=height+'px';document.querySelector('.battle').append(canvas);const started=animationClock.time;
 function tick(){if(token!==generation||!canvas.isConnected){canvas.remove();return;}const t=Math.min(1,(animationClock.time-started)/duration),f=cellFrames[ids[Math.min(ids.length-1,Math.floor(t*ids.length))]],ctx=canvas.getContext('2d');canvas.style.left=(beam?Math.min(from.x,to.x):from.x+(to.x-from.x)*t-width/2)+'px';canvas.style.top=(from.y+(to.y-from.y)*t-height/2)+'px';ctx.clearRect(0,0,canvas.width,height);ctx.imageSmoothingEnabled=false;ctx.save();ctx.translate(canvas.width,0);ctx.scale(-1,1);if(beam){const w=Math.max(1,canvas.width*Math.min(1,t*1.5));ctx.drawImage(cellArt,f.x,f.y,f.w,f.h,0,0,w,height);}else{const z=Math.min(width/f.w,height/f.h);ctx.drawImage(cellArt,f.x,f.y,f.w,f.h,(width-f.w*z)/2,(height-f.h*z)/2,f.w*z,f.h*z);}ctx.restore();canvas.dataset.frame=ids[Math.min(ids.length-1,Math.floor(t*ids.length))];if(t<1)requestAnimationFrame(tick);}
 tick();return canvas;
}
async function runCellLab(key){
 if(!labMode||busy||!CELL_CLIPS[key])return;animationClock.paused=false;generation++;animationClock.cancelWaits();clearBattleFx();state=createGame();prepareLabState();const token=generation,c=CELL_CLIPS[key];busy=true;render();
 try{
 await cellReady;if(token!==generation)return;const actor=$('vegeta'),target=$('goku'),battle=document.querySelector('.battle'),stage=battle.getBoundingClientRect(),a=actor.getBoundingClientRect(),b=target.getBoundingClientRect();const entry=customSprites?.[spriteKey('cell','base',key)],frames=entry?customSequence(entry).map(i=>entry.frames[i]):c.frames.map(id=>({duration:cellDuration(c,id)}));let motion;
 if(c.contact||c.move){const travel=c.contact?b.left+b.width/2+85-(a.left+a.width/2):-100;motion=animateGame(actor,[{translate:'0px 0px'},{translate:travel+'px 0px'}],{duration:240,fill:'forwards',easing:'ease-out'});comboMotions.add(motion);await delay(240);if(token!==generation)return;}
 if(c.jump){motion=animateGame(actor,[{translate:'0px 0px'},{translate:'0px -85px',offset:.5},{translate:'0px 0px'}],{duration:frames.reduce((sum,f)=>sum+f.duration,0)});comboMotions.add(motion);}
 cellPlayback={key,start:animationClock.time,token};actor.dataset.customClip=key;actor.dataset.customStart=String(animationClock.time);actor.dataset.move=key;
 const release=entry?Math.max(0,frames.findIndex(f=>f.event==='release')<0?frames.length-1:frames.findIndex(f=>f.event==='release')):c.release;
 let effectDone=Promise.resolve();
 for(let i=0;i<frames.length;i++){
  if(token!==generation)return;
  if((c.contact&&i>0&&i%2===1)||frames[i].event==='impact')cellHit(target,stage);
  if(c.shot&&i===release){
   const from={x:a.left-stage.left+a.width/2-40,y:a.bottom-stage.top-90},to={x:b.left-stage.left+b.width/2,y:from.y};
   const shots=[cellEffect([c.shot],from,to,250,token,{beam:c.beam,width:c.shot==='114'?100:95,height:c.shot==='projectile'?18:c.beam?60:25})];
   if(key==='kienzan')shots.push(cellEffect(['115'],{...from,y:from.y+25},{...to,y:to.y+25},250,token,{width:100,height:25}));
   effectDone=(async()=>{
    await delay(250);if(token!==generation)return;cellHit(target,stage);
    if(c.impact){const fx=cellEffect(['impact0','impact1','impact2'],to,to,750,token,{width:170,height:170});await delay(250);if(token!==generation)return;shots.forEach(shot=>shot.remove());await delay(500);if(token!==generation)return;fx.remove();}
    else{await delay(180);if(token!==generation)return;shots.forEach(shot=>shot.remove());}
   })();
  }
  if(c.ground&&i===2){const point={x:b.left-stage.left+b.width/2,y:b.bottom-stage.top-55};cellEffect(['121','122','123','124'],point,point,720,token,{width:130,height:150});cellHit(target,stage);effectDone=delay(720);}
  await delay(frames[i].duration);
 }
 await effectDone;
 if(token!==generation)return;cellPlayback=null;if(motion){motion.cancel();comboMotions.delete(motion);}clearBattleFx();busy=false;render();$('labStatus').textContent='Cell Perfeito · animação concluída · teste visual';
 if($('labRepeat').checked){await delay(600);if(token===generation&&labMode)runCellLab(key);}
 }catch(error){if(token!==generation)return;cellPlayback=null;clearBattleFx();busy=false;render();$('labStatus').textContent='Não foi possível reproduzir Cell Perfeito.';console.error(error);}
}

if(labMode)toggleLab(true);

// Pacote portátil de sprites: manifesto do projeto + alterações locais por identidade.
var customSprites={},customImages=new Map();
function spriteKey(character,form,clip){return `${character}/${form}/${clip}`;}
function spriteDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('kame-duel-sprites',1);r.onupgradeneeded=()=>r.result.createObjectStore('packages');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function localSprites(write){const db=await spriteDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('packages',write?'readwrite':'readonly'),store=tx.objectStore('packages'),key=window.__spritePackage?'sprites:'+String(window.__spritePackageId||'embedded'):'sprites',r=write?store.put(write,key):store.get(key);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
async function validateSprites(pack){
 if(pack?.version!==1||!pack.sprites||typeof pack.sprites!=='object'||Array.isArray(pack.sprites))throw Error('Pacote de sprites inválido.');
 const out={};if(Object.keys(pack.sprites).length>200)throw Error('Pacote muito grande.');
 for(const [key,entry]of Object.entries(pack.sprites)){
  if(!/^(goku|gogeta|vegeta|saibaman|cell)\/(base|ssj)\/[a-zA-Z][a-zA-Z0-9]*$/.test(key)||!/^data:image\/(png|webp);base64,/.test(entry.image||'')||entry.image.length>24000000)throw Error('Sprite ou destino inválido.');
  const image=new Image();image.src=entry.image;await image.decode();if(!Array.isArray(entry.frames)||!entry.frames.length||entry.frames.length>256)throw Error('Quadros inválidos.');
  for(const f of entry.frames)if(![f.x,f.y,f.w,f.h,f.duration].every(Number.isFinite)||f.x<0||f.y<0||f.w<1||f.h<1||f.x+f.w>image.width||f.y+f.h>image.height||f.duration<16||f.duration>10000)throw Error('Recorte ou tempo de quadro inválido.');
  for(const f of entry.frames){for(const k of ['pivotX','pivotY','offsetX','offsetY'])if(f[k]!==undefined&&(!Number.isFinite(f[k])||Math.abs(f[k])>4096))throw Error('Pivô ou deslocamento inválido.');if(f.event&&!['impact','release'].includes(f.event))throw Error('Marcador inválido.');}
  if(entry.mode&&!['once','loop','pingpong'].includes(entry.mode))throw Error('Modo inválido.');if(entry.scale!==undefined&&(!Number.isFinite(entry.scale)||entry.scale<.25||entry.scale>3))throw Error('Escala inválida.');if(entry.canvasHeight!==undefined&&(!Number.isFinite(entry.canvasHeight)||entry.canvasHeight<1||entry.canvasHeight>4096))throw Error('Altura inválida.');
  out[key]={image:entry.image,frames:entry.frames,sourceName:String(entry.sourceName||'sprite').slice(0,150),mode:entry.mode||'loop',scale:entry.scale||1,canvasHeight:entry.canvasHeight||entry.frames[0].h,studio:entry.studio===true};customImages.set(entry.image,image);
 }return out;
}
const customSpritesReady=(async()=>{try{if(window.__spritePackage)customSprites=await validateSprites(window.__spritePackage);else{const response=await fetch('/assets/sprite-overrides.json');if(response.ok)customSprites=await validateSprites(await response.json());}}catch(error){$('spriteSaveStatus').textContent='Pacote do projeto não carregado: '+error.message;}try{const saved=await localSprites();if(saved)Object.assign(customSprites,await validateSprites(saved));}catch{}updateSpritePreview();})();
function editorKey(){return spriteKey($('spriteCharacter').value,$('spriteForm').value,$('spriteClip').value);}
function editorChoices(characterChanged=true){
 if(characterChanged){const old=$('spriteCharacter').value,names=$('spriteTarget').value==='player'?{goku:'Goku',gogeta:'Gogeta'}:{vegeta:'Vegeta',saibaman:'Saibaman',cell:'Cell Perfeito'};$('spriteCharacter').replaceChildren(...Object.entries(names).map(([value,label])=>new Option(label,value)));if(names[old])$('spriteCharacter').value=old;}
 const character=$('spriteCharacter').value,form=$('spriteForm').value,forms=character==='gogeta'?{ssj:'Super Saiyajin'}:enemyClips(character)?{base:'Base'}:{base:'Base',ssj:'Super Saiyajin'};$('spriteForm').replaceChildren(...Object.entries(forms).map(([value,label])=>new Option(label,value)));if(forms[form])$('spriteForm').value=form;
 const clips=enemyClips(character)||{idle:{name:'Postura / Idle'},hurt:{name:'Receber dano'},...CARDS},clip=$('spriteClip').value;$('spriteClip').replaceChildren(...Object.entries(clips).map(([value,c])=>new Option(c.name,value)));if(clips[clip])$('spriteClip').value=clip;updateSpritePreview();
}
function updateSpritePreview(){const c=$('customSpritePreview'),ctx=c.getContext('2d');ctx.clearRect(0,0,256,256);const entry=customSprites[editorKey()];$('spriteSaveStatus').textContent=entry?'Sprite salvo: '+entry.sourceName:'Nenhuma substituição salva para esta combinação.';}
$('spriteTarget').onchange=()=>editorChoices();$('spriteCharacter').onchange=()=>editorChoices(false);$('spriteForm').onchange=updateSpritePreview;$('spriteClip').onchange=updateSpritePreview;editorChoices();
async function readAseSprite(file){
 const data=new Uint8Array(await file.arrayBuffer()),v=new DataView(data.buffer),count=v.getUint16(6,true),w=v.getUint16(8,true),h=v.getUint16(10,true);if(v.getUint16(4,true)!==0xA5E0||v.getUint16(12,true)!==32||count<1||count>256||w*h*count>16000000||w*count>32767)throw Error('Use Aseprite RGBA de até 256 quadros e 16 milhões de pixels.');
 const atlas=document.createElement('canvas');atlas.width=w*count;atlas.height=h;const ctx=atlas.getContext('2d'),layers=[],history=[],frames=[];let pos=128;
 for(let index=0;index<count;index++){
  const end=pos+v.getUint32(pos,true);if(end>data.length||v.getUint16(pos+4,true)!==0xf1fa)throw Error('Aseprite inválido.');const chunks=v.getUint32(pos+12,true)||v.getUint16(pos+6,true),duration=v.getUint16(pos+8,true);let offset=pos+16;const cels={};
  for(let j=0;j<chunks;j++){const size=v.getUint32(offset,true),type=v.getUint16(offset+4,true),b=offset+6;if(size<6||offset+size>end)throw Error('Bloco Aseprite inválido.');
   if(type===0x2004){if(v.getUint16(b+2,true)!==0||v.getUint16(b+4,true)!==0||v.getUint16(b+10,true)!==0)throw Error('Use camadas simples com mesclagem normal.');layers.push({visible:!!(v.getUint16(b,true)&1),opacity:v.getUint8(b+12)});}
   if(type===0x2005){const layer=v.getUint16(b,true),x=v.getInt16(b+2,true),y=v.getInt16(b+4,true),opacity=v.getUint8(b+6),kind=v.getUint16(b+7,true);if(v.getInt16(b+9,true)!==0)throw Error('Ordem especial de camadas não suportada.');let image;
    if(kind===1){image=history[v.getUint16(b+16,true)]?.[layer]?.image;if(!image)throw Error('Quadro vinculado inválido.');}
    else if(kind===0||kind===2){const cw=v.getUint16(b+16,true),ch=v.getUint16(b+18,true);let bytes=data.slice(b+20,offset+size);if(kind===2)bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());if(bytes.length!==cw*ch*4)throw Error('Pixels inválidos.');image=document.createElement('canvas');image.width=cw;image.height=ch;image.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(bytes),cw,ch),0,0);}
    else throw Error('Tilemaps não suportados.');cels[layer]={image,x,y,opacity};
   }offset+=size;
  }
  ctx.save();ctx.beginPath();ctx.rect(index*w,0,w,h);ctx.clip();for(let layer=0;layer<layers.length;layer++){const cel=cels[layer];if(cel&&layers[layer].visible){ctx.globalAlpha=cel.opacity*layers[layer].opacity/65025;ctx.drawImage(cel.image,index*w+cel.x,cel.y);}}ctx.restore();history.push(cels);frames.push({x:index*w,y:0,w,h,duration:Math.max(16,duration)});pos=end;
 }return {image:atlas.toDataURL(),frames,sourceName:file.name};
}
async function readSpriteFile(file){if(file.size>8*1024*1024)throw Error('Use arquivos de até 8 MB.');if(/\.ase(?:prite)?$/i.test(file.name))return readAseSprite(file);if(!['image/png','image/webp'].includes(file.type))throw Error('Use PNG, WebP ou Aseprite.');const image=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);}),im=new Image();im.src=image;await im.decode();const cols=Number($('spriteCols').value),rows=Number($('spriteRows').value),fps=Number($('spriteFps').value);if(![cols,rows].every(n=>Number.isInteger(n)&&n>0)||cols*rows>256||im.width%cols||im.height%rows||fps<1||fps>60)throw Error('Confira colunas, linhas e velocidade.');return {image,frames:Array.from({length:cols*rows},(_,i)=>({x:i%cols*im.width/cols,y:Math.floor(i/cols)*im.height/rows,w:im.width/cols,h:im.height/rows,duration:1000/fps})),sourceName:file.name};}
async function persistSprites(){try{await localSprites({version:1,sprites:customSprites});return 'Salvo neste navegador. Exporte para guardar no projeto.';}catch{return 'Aplicado nesta sessão. O navegador não permitiu salvar; use Exportar para o projeto.';}}
$('spriteSave').onclick=async()=>{const button=$('spriteSave');button.disabled=true;try{const file=$('spriteFile').files[0];if(!file)throw Error('Selecione o arquivo da animação.');const key=editorKey(),entry=await readSpriteFile(file);Object.assign(customSprites,await validateSprites({version:1,sprites:{[key]:entry}}));$('spriteSaveStatus').textContent=await persistSprites();}catch(e){$('spriteSaveStatus').textContent=e.message;}finally{button.disabled=false;}};
$('spriteRemove').onclick=async()=>{delete customSprites[editorKey()];$('spriteSaveStatus').textContent='Animação original restaurada. '+await persistSprites();};
$('spriteExport').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,sprites:customSprites},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='sprite-overrides.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('spriteSaveStatus').textContent='Pacote exportado. Inclua-o em assets/sprite-overrides.json para o jogo final.';};
$('spriteImport').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>32*1024*1024)throw Error('Pacote muito grande.');Object.assign(customSprites,await validateSprites(JSON.parse(await file.text())));$('spriteSaveStatus').textContent=await persistSprites();}catch(error){$('spriteSaveStatus').textContent=error.message;}};
function customIdentity(side){const f=state[side],character=f.form==='gogetaSSJ'?'gogeta':f.name==='Cell Perfeito'?'cell':f.name.toLowerCase(),form=f.transformed?'ssj':'base';return {character,form};}
function customSequence(entry){const seq=entry.frames.map((_,i)=>i);return entry.mode==='pingpong'&&seq.length>1?seq.concat(seq.slice(1,-1).reverse()):seq;}
function sampleCustomFrame(entry,elapsed){const seq=customSequence(entry),total=seq.reduce((n,i)=>n+entry.frames[i].duration,0);let time=entry.mode==='once'?Math.min(total-1,Math.max(0,elapsed)):Math.max(0,elapsed)%total;for(const i of seq){if(time<entry.frames[i].duration)return i;time-=entry.frames[i].duration;}return seq.at(-1);}
for(const [side,id]of [['player','goku'],['enemy','vegeta']]){
 const actor=$(id),canvas=document.createElement('canvas');canvas.width=384;canvas.height=336;canvas.className='custom-frames';canvas.setAttribute('aria-hidden','true');actor.append(canvas);let previous='',started=0;
 function tick(){const {character,form}=customIdentity(side);let clip=actor.classList.contains('hit')?'hurt':'idle';if(busy&&state.turn===side)clip=actor.dataset.customClip||(side==='enemy'&&isSaibamanActor()&&saibaPlayback?.token===generation?saibaPlayback.key:actor.dataset.move||'idle');const key=spriteKey(character,form,clip),live=studioLive?.side===side&&$('studioDialog').open?studioLive:null,entry=live?.entry||customSprites[key];actor.classList.toggle('custom-animation',!!entry);if(entry){if(previous!==key){previous=key;started=animationClock.time;}let elapsed=animationClock.time-started;if(actor.dataset.customClip===clip)elapsed=animationClock.time-Number(actor.dataset.customStart);else if(clip==='kienzan')elapsed=animationClock.time-Number(actor.dataset.kienzanStart||started);const index=live?live.index:sampleCustomFrame(entry,elapsed),f=entry.frames[index]||entry.frames[0],ctx=canvas.getContext('2d'),z=224/(entry.canvasHeight||f.h)*(entry.scale||1);ctx.clearRect(0,0,384,336);ctx.imageSmoothingEnabled=false;ctx.save();if(side==='enemy'){ctx.translate(384,0);ctx.scale(-1,1);}ctx.drawImage(customImages.get(entry.image),f.x,f.y,f.w,f.h,192+((f.offsetX||0)-(f.pivotX??f.w/2))*z,318+((f.offsetY||0)-(f.pivotY??f.h))*z,f.w*z,f.h*z);ctx.restore();canvas.dataset.key=live?'studio-preview':key;canvas.dataset.frame=String(index);}else previous='';requestAnimationFrame(tick);}
 requestAnimationFrame(tick);
}
function editorTick(){const entry=customSprites[editorKey()];if(entry&&$('spriteDialog').open){const duration=entry.frames.reduce((n,f)=>n+f.duration,0);let time=animationClock.time%duration,index=0;while(index<entry.frames.length-1&&time>=entry.frames[index].duration){time-=entry.frames[index].duration;index++;}const f=entry.frames[index],ctx=$('customSpritePreview').getContext('2d');ctx.clearRect(0,0,256,256);ctx.imageSmoothingEnabled=false;const scale=Math.min(224/f.w,224/f.h);ctx.drawImage(customImages.get(entry.image),f.x,f.y,f.w,f.h,128-f.w*scale/2,240-f.h*scale,f.w*scale,f.h*scale);}requestAnimationFrame(editorTick);}requestAnimationFrame(editorTick);

// Montagem de animações. Rascunho independente das animações já aplicadas.
var studioLive=null;
const studio={frames:[],library:[],selected:0,playing:false,time:0,last:null,undo:[],redo:[],dirty:false,entry:null,key:'',revision:0};
function studioKey(){return spriteKey($('stCharacter').value,$('stForm').value,$('stClip').value);}
function studioSnapshot(){return {frames:structuredClone(studio.frames),selected:studio.selected,mode:$('stMode').value,scale:$('stScale').value};}
function studioRestore(s){studio.frames=s.frames;studio.selected=s.selected;$('stMode').value=s.mode;$('stScale').value=s.scale;studioChanged();}
function studioEdit(fn){studio.undo.push(studioSnapshot());if(studio.undo.length>30)studio.undo.shift();studio.redo=[];fn();studioChanged();}
function studioImageData(image){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);const src=c.toDataURL();customImages.set(src,c);return src;}
function studioFrame(entry,f){return {...f,image:entry.image,pivotX:f.pivotX??f.w/2,pivotY:f.pivotY??f.h,offsetX:f.offsetX||0,offsetY:f.offsetY||0,event:f.event||''};}
function studioBuild(){
 if(!studio.frames.length){studio.entry=null;studioLive=null;$('stCanvas').getContext('2d').clearRect(0,0,640,400);$('stArena').getContext('2d').clearRect(0,0,400,210);$('stFrameInfo').textContent='Importe ou carregue uma animação';return;}
 const w=studio.frames.reduce((n,f)=>n+f.w,0),h=Math.max(...studio.frames.map(f=>f.h));if(w*h>16000000||w>32767)throw Error('A sequência excede o tamanho máximo do atlas.');
 const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d'),frames=[];let x=0;
 for(const f of studio.frames){ctx.drawImage(customImages.get(f.image),f.x,f.y,f.w,f.h,x,0,f.w,f.h);const {image,...meta}=f;frames.push({...meta,x,y:0});x+=f.w;}
 const image=c.toDataURL();customImages.set(image,c);studio.entry={image,frames,sourceName:'Animation Studio · '+$('stClip').selectedOptions[0].textContent,studio:true,mode:$('stMode').value,scale:Number($('stScale').value)||1,canvasHeight:h};
 studioLive={side:$('stTarget').value,entry:studio.entry,time:studio.time,index:studio.selected};
}
function studioChanged(){studio.revision++;studio.dirty=true;studio.playing=false;studio.time=0;studio.selected=Math.max(0,Math.min(studio.selected,studio.frames.length-1));studioBuild();studioRender();}
function studioThumb(canvas,f){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);if(!f)return;c.imageSmoothingEnabled=false;const z=Math.min((canvas.width-8)/f.w,(canvas.height-8)/f.h);c.drawImage(customImages.get(f.image),f.x,f.y,f.w,f.h,(canvas.width-f.w*z)/2,(canvas.height-f.h*z)/2,f.w*z,f.h*z);}
function studioRender(){
 $('studioDirty').textContent=studio.dirty?'● Alterações no rascunho':'✓ Aplicado';$('stDuration').textContent=`${studio.frames.length} quadros · ${(studio.frames.reduce((n,f)=>n+f.duration,0)/1000).toFixed(2)} s`;
 $('stPlay').textContent=studio.playing?'Ⅱ Pausar':'▶ Reproduzir';$('stUndo').disabled=!studio.undo.length;$('stRedo').disabled=!studio.redo.length;
 for(const id of ['studioSave','stBattle','stPlay','stDuplicate','stDelete','stFeet','stSetFps'])$(id).disabled=!studio.frames.length;
 const f=studio.frames[studio.selected];for(const [id,k]of [['stMs','duration'],['stPivotX','pivotX'],['stPivotY','pivotY'],['stOffsetX','offsetX'],['stOffsetY','offsetY'],['stEvent','event']]){$(id).disabled=!f;$(id).value=f?f[k]:'';}
 $('stFrames').replaceChildren(...studio.frames.map((f,i)=>{const b=document.createElement('button'),c=document.createElement('canvas');c.width=64;c.height=64;studioThumb(c,f);b.append(c,document.createTextNode(`${i+1} · ${Math.round(f.duration)} ms${f.event?' ✦':''}`));b.classList.toggle('selected',i===studio.selected);b.draggable=true;b.dataset.index=i;b.setAttribute('aria-label',`Quadro ${i+1}`);b.onclick=()=>{studio.playing=false;studio.selected=i;studioRender();};b.ondragstart=e=>e.dataTransfer.setData('text/plain',String(i));b.ondragover=e=>e.preventDefault();b.ondrop=e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(from)&&from>=0&&from<studio.frames.length)studioEdit(()=>{const [f]=studio.frames.splice(from,1);studio.frames.splice(i,0,f);studio.selected=i;});};return b;}));
}
function studioLibrary(){ $('stLibrary').replaceChildren(...studio.library.map((f,i)=>{const b=document.createElement('button'),c=document.createElement('canvas');c.width=64;c.height=64;studioThumb(c,f);b.append(c,document.createTextNode(String(i+1)));b.title='Adicionar este quadro à sequência';b.onclick=()=>{if(studio.frames.length>=256)return;studioEdit(()=>{studio.frames.push({...f});studio.selected=studio.frames.length-1;});};return b;}));}
function studioChoices(resetCharacter=true){
 const chars=$('stTarget').value==='player'?{goku:'Goku',gogeta:'Gogeta'}:{vegeta:'Vegeta',saibaman:'Saibaman',cell:'Cell Perfeito'},old=$('stCharacter').value;
 if(resetCharacter){$('stCharacter').replaceChildren(...Object.entries(chars).map(([v,t])=>new Option(t,v)));if(chars[old])$('stCharacter').value=old;}
 const character=$('stCharacter').value,forms=character==='gogeta'?{ssj:'Super Saiyajin'}:enemyClips(character)?{base:'Base'}:{base:'Base',ssj:'Super Saiyajin'},form=$('stForm').value;$('stForm').replaceChildren(...Object.entries(forms).map(([v,t])=>new Option(t,v)));if(forms[form])$('stForm').value=form;
 const clips=enemyClips(character)||{idle:{name:'Postura / Idle'},hurt:{name:'Receber dano'},...CARDS},clip=$('stClip').value;$('stClip').replaceChildren(...Object.entries(clips).map(([v,c])=>new Option(c.name,v)));if(clips[clip])$('stClip').value=clip;
}
function studioSetEntry(entry){studio.frames=entry.frames.map(f=>studioFrame(entry,f));studio.library=structuredClone(studio.frames);studio.selected=0;studio.time=0;studio.playing=false;studio.undo=[];studio.redo=[];$('stMode').value=entry.mode||'loop';$('stScale').value=entry.scale||1;studioBuild();studio.dirty=false;studio.key=studioKey();studioLibrary();studioRender();}
async function studioOriginal(){
 const character=$('stCharacter').value,form=$('stForm').value,clip=$('stClip').value,key=studioKey();await customSpritesReady;if(customSprites[key])return structuredClone(customSprites[key]);
 let im,frames;
 if(character==='saibaman'){await saibaReady;im=saibaArt;frames=(SAIBA_CLIPS[clip]||SAIBA_CLIPS.idle).frames.map(n=>{const f=saibaFrames[n];return {...f,duration:SAIBA_CLIPS[clip]?.ms||150,pivotX:f.pivot,pivotY:f.h};});}
 else if(character==='cell'){await cellReady;im=cellArt;const c=CELL_CLIPS[clip]||CELL_CLIPS.idle;frames=c.frames.map((id,i)=>({...cellFrames[id],duration:cellDuration(c,id),event:i===c.release?'release':''}));}
 else if(character==='gogeta'){await gogetaReady;im=gogetaSheet;const ff=clip==='transform'||clip==='gogeta'?gogetaMetadata.frames:[gogetaMetadata.frames.at(-1)];frames=ff.map(f=>({x:f.x,y:f.y,w:f.width,h:f.height,duration:f.duration}));}
 else if(character==='goku'&&clip==='idle'){await(form==='ssj'?ssjIdleReady:idleReady);im=form==='ssj'?ssjIdleSheet:idleSheet;frames=(form==='ssj'?ssjIdleMetadata:idleMetadata).frames.map(f=>({x:f.x,y:f.y,w:f.width,h:f.height,duration:f.duration}));}
 else if(character==='goku'&&clip==='beam'&&form==='base'){await baseKameReady;im=baseKameSheet;frames=baseKameMetadata.frames.map(f=>({x:f.x,y:f.y,w:f.width,h:f.height,duration:f.duration}));}
 else if(character==='goku'&&clip==='kienzan'){await kienzanReady;im=kienzanArt.throw.image;frames=kienzanArt.throw.metadata.frames.map(f=>({x:f.x,y:f.y,w:f.width,h:f.height,duration:f.duration}));}
 else if(character==='goku'){
  im=new Image();im.src='/assets/goku-original.png';await im.decode();const name={strike:form==='ssj'?'ssjStrike':'strike',blast:form==='ssj'?'ssjFire':'kiBurst',beam:'ssjFire',superBeam:'ssjFire',charge:form==='ssj'?'ssjCharge':'charge',guard:'idle',evade:'evade',transform:'transform',gogeta:'transform',hurt:'hurt'}[clip]||'idle';const source=GOKU_CLIPS[name]||GOKU_CLIPS.idle,z=im.width/731,atlas=document.createElement('canvas');atlas.width=source.length*256;atlas.height=256;const ctx=atlas.getContext('2d');frames=[];
  source.forEach((f,i)=>{const w=Math.round(f[2]*z),h=Math.round(f[3]*z);ctx.drawImage(im,Math.round(f[0]*z),Math.round(f[1]*z),w,h,i*256,0,w,h);frames.push({x:i*256,y:0,w,h,duration:f[4]});});const data=ctx.getImageData(0,0,atlas.width,256);for(const f of frames){const seen=new Set(),queue=[];const add=(x,y)=>{if(x<0||y<0||x>=f.w||y>=f.h)return;const n=y*f.w+x;if(seen.has(n))return;seen.add(n);const k=(y*atlas.width+f.x+x)*4;if(data.data[k]>=244&&data.data[k+1]>=244&&data.data[k+2]>=244)queue.push([x,y]);};for(let x=0;x<f.w;x++){add(x,0);add(x,f.h-1);}for(let y=0;y<f.h;y++){add(0,y);add(f.w-1,y);}for(let j=0;j<queue.length;j++){const [x,y]=queue[j];data.data[(y*atlas.width+f.x+x)*4+3]=0;add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1);}}ctx.putImageData(data,0,0);im=atlas;
 }else{im=new Image();im.src='/assets/battle-atlas.png';await im.decode();const col=clip==='strike'?2:['beam','blast','charge','superBeam'].includes(clip)?3:1;frames=[{x:im.width/4*col,y:im.height/2,w:im.width/4,h:im.height/2,duration:180}];}
 const canvasHeight=Math.max(...frames.map(f=>f.h));const scale=character==='cell'?Math.max(.25,Math.min(3,canvasHeight*1.2/224)):character==='saibaman'?Math.min(3,canvasHeight*(clip==='charge'?5.8:clip==='beamFx'?3.5:4.5)/224):character==='gogeta'?360*.85/224:1;return {image:studioImageData(im),frames,canvasHeight,scale,sourceName:character+' · '+clip,mode:clip==='idle'?'loop':'once'};
}
async function studioLoad(){try{studioSetEntry(await studioOriginal());$('stStatus').textContent='Animação carregada. Selecione ou arraste quadros para editar.';}catch(e){$('stStatus').textContent=e.message;}}
$('studioButton').onclick=async()=>{if(busy)return;$('stTarget').value=$('labActor').value;studioChoices();$('stCharacter').value=$('labActor').value==='player'?$('labPlayer').value:$('labOpponent').value;studioChoices(false);$('stForm').value=$('labActor').value==='player'?$('labForm').value:$('labEnemyForm').value;$('stClip').value=currentLabSkill();$('stMirror').checked=$('stTarget').value==='enemy';$('studioDialog').showModal();await studioLoad();await studioCapabilities();};
function studioClose(){if(studio.dirty&&!confirm('Fechar sem aplicar as alterações do rascunho?'))return;studio.playing=false;studioLive=null;$('studioDialog').close();}
$('studioClose').onclick=studioClose;$('studioDialog').addEventListener('cancel',e=>{e.preventDefault();studioClose();});
$('stLoad').onclick=()=>{if(!studio.dirty||confirm('Substituir o rascunho pela animação salva?'))studioLoad();};
for(const id of ['stTarget','stCharacter','stForm','stClip'])$(id).onchange=()=>{studioChoices(id==='stTarget');$('stMirror').checked=$('stTarget').value==='enemy';$('stStatus').textContent='Destino alterado. Salvar associa o rascunho a este destino; Carregar abre sua animação atual.';studio.dirty=true;studioBuild();studioRender();};
$('stFiles').onchange=async e=>{try{const files=[...e.target.files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));let incoming=[];const oldCols=$('spriteCols').value,oldRows=$('spriteRows').value,oldFps=$('spriteFps').value;try{$('spriteCols').value=$('stCols').value;$('spriteRows').value=$('stRows').value;$('spriteFps').value=$('stFps').value;for(const file of files){const entry=await readSpriteFile(file);await validateSprites({version:1,sprites:{[studioKey()]:entry}});incoming.push(...entry.frames.map(f=>studioFrame(entry,f)));if(incoming.length>256)throw Error('Limite de 256 quadros por importação.');}}finally{$('spriteCols').value=oldCols;$('spriteRows').value=oldRows;$('spriteFps').value=oldFps;}studio.library=incoming;studioLibrary();if(!studio.frames.length)studioEdit(()=>{studio.frames=structuredClone(incoming);});$('stStatus').textContent=`${incoming.length} quadros na biblioteca. Clique nos quadros ou em Adicionar todos.`;}catch(error){$('stStatus').textContent=error.message;}};
$('stAppendAll').onclick=()=>{if(studio.frames.length+studio.library.length>256){$('stStatus').textContent='Limite de 256 quadros.';return;}studioEdit(()=>studio.frames.push(...structuredClone(studio.library)));};
$('stDuplicate').onclick=()=>{if(studio.frames.length>=256)return;studioEdit(()=>{studio.frames.splice(studio.selected+1,0,{...studio.frames[studio.selected]});studio.selected++;});};
$('stDelete').onclick=()=>studioEdit(()=>studio.frames.splice(studio.selected,1));
for(const [id,delta]of [['stLeft',-1],['stRight',1]])$(id).onclick=()=>{const next=studio.selected+delta;if(next<0||next>=studio.frames.length)return;studioEdit(()=>{const [f]=studio.frames.splice(studio.selected,1);studio.frames.splice(next,0,f);studio.selected=next;});};
$('stUndo').onclick=()=>{if(!studio.undo.length)return;studio.redo.push(studioSnapshot());studioRestore(studio.undo.pop());};$('stRedo').onclick=()=>{if(!studio.redo.length)return;studio.undo.push(studioSnapshot());studioRestore(studio.redo.pop());};
for(const [id,k,min,max]of [['stMs','duration',16,10000],['stPivotX','pivotX',-2048,2048],['stPivotY','pivotY',-2048,2048],['stOffsetX','offsetX',-2048,2048],['stOffsetY','offsetY',-2048,2048]])$(id).onchange=()=>{const value=Number($(id).value);if(!Number.isFinite(value)||value<min||value>max)return;studioEdit(()=>studio.frames[studio.selected][k]=value);};
$('stEvent').onchange=()=>studioEdit(()=>studio.frames[studio.selected].event=$('stEvent').value);
$('stFeet').onclick=()=>studioEdit(()=>{for(const f of studio.frames){f.pivotX=f.w/2;f.pivotY=f.h;f.offsetX=0;f.offsetY=0;}});
$('stSetFps').onclick=()=>{const fps=Number($('stFps').value);if(fps>=1&&fps<=60)studioEdit(()=>studio.frames.forEach(f=>f.duration=1000/fps));};
$('stMode').onchange=()=>{const value=$('stMode').value;$('stMode').value=studio.entry?.mode||'loop';studioEdit(()=>$('stMode').value=value);};$('stScale').onchange=()=>{const n=Number($('stScale').value);$('stScale').value=studio.entry?.scale||1;studioEdit(()=>$('stScale').value=Math.min(3,Math.max(.25,n||1)));};
$('stPlay').onclick=()=>{studio.playing=!studio.playing;if(studio.playing)studio.time=studio.frames.slice(0,studio.selected).reduce((n,f)=>n+f.duration,0);studioRender();};
for(const [id,delta]of [['stPrev',-1],['stNext',1]])$(id).onclick=()=>{if(!studio.frames.length)return;studio.playing=false;studio.selected=(studio.selected+delta+studio.frames.length)%studio.frames.length;studioRender();};
$('studioDialog').addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();$('stPlay').click();}if(e.key==='ArrowLeft')$('stPrev').click();if(e.key==='ArrowRight')$('stNext').click();});
let studioDrag=null;
function studioPoint(e){const r=$('stCanvas').getBoundingClientRect();return {x:(e.clientX-r.left)*640/r.width,y:(e.clientY-r.top)*400/r.height};}
$('stCanvas').onpointerdown=e=>{if(!studio.frames.length)return;studio.playing=false;const f=studio.frames[studio.selected],p=studioPoint(e),z=Number($('stZoom').value),sign=$('stMirror').checked?-1:1;studio.undo.push(studioSnapshot());studio.redo=[];
 if($('stTool').value==='pivot'){f.pivotX=Math.round(f.pivotX+sign*(p.x-320)/z-f.offsetX);f.pivotY=Math.round(f.pivotY+(p.y-320)/z-f.offsetY);studioChanged();return;}
 studioDrag={p,x:f.offsetX,y:f.offsetY,z,sign};$('stCanvas').setPointerCapture(e.pointerId);};
$('stCanvas').onpointermove=e=>{if(!studioDrag)return;const p=studioPoint(e),f=studio.frames[studio.selected];f.offsetX=Math.round(studioDrag.x+(p.x-studioDrag.p.x)/studioDrag.z*studioDrag.sign);f.offsetY=Math.round(studioDrag.y+(p.y-studioDrag.p.y)/studioDrag.z);};
$('stCanvas').onpointerup=$('stCanvas').onpointercancel=()=>{if(studioDrag){studioDrag=null;studioChanged();}};
function studioPaint(ctx,f,x,y,z,alpha=1,mirror=false){ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.translate(x,y);if(mirror)ctx.scale(-1,1);ctx.drawImage(customImages.get(f.image),f.x,f.y,f.w,f.h,(f.offsetX-f.pivotX)*z,(f.offsetY-f.pivotY)*z,f.w*z,f.h*z);ctx.restore();}
function studioTick(now){const delta=studio.last===null?0:Math.min(80,now-studio.last);studio.last=now;
 if($('studioDialog').open&&studio.frames.length){if(studio.playing){studio.time+=delta;studio.selected=sampleCustomFrame(studio.entry,studio.time);if($('stMode').value==='once'&&studio.time>=studio.frames.reduce((n,f)=>n+f.duration,0)){studio.playing=false;studioRender();}}
 const f=studio.frames[studio.selected],ctx=$('stCanvas').getContext('2d'),z=Number($('stZoom').value),mirror=$('stMirror').checked;ctx.clearRect(0,0,640,400);
 if($('stGrid').checked){ctx.strokeStyle='#ffffff15';ctx.beginPath();for(let x=320%z;x<640;x+=z){ctx.moveTo(x,0);ctx.lineTo(x,400);}for(let y=320%z;y<400;y+=z){ctx.moveTo(0,y);ctx.lineTo(640,y);}ctx.stroke();}
 ctx.strokeStyle='#54cbdc88';ctx.beginPath();ctx.moveTo(0,320);ctx.lineTo(640,320);ctx.moveTo(320,0);ctx.lineTo(320,400);ctx.stroke();
 if($('stOnion').checked){if(studio.selected>0)studioPaint(ctx,studio.frames[studio.selected-1],320,320,z,.22,mirror);if(studio.selected<studio.frames.length-1)studioPaint(ctx,studio.frames[studio.selected+1],320,320,z,.12,mirror);}studioPaint(ctx,f,320,320,z,1,mirror);
 ctx.strokeStyle='#bb8cff';ctx.strokeRect(316,316,8,8);if($('stBox').checked){ctx.strokeStyle='#ffba65';const x=mirror?320-(f.w-f.pivotX+f.offsetX)*z:320+(f.offsetX-f.pivotX)*z;ctx.strokeRect(x,320+(f.offsetY-f.pivotY)*z,f.w*z,f.h*z);}
 $('stFrameInfo').textContent=`Quadro ${studio.selected+1}/${studio.frames.length} · ${Math.round(f.duration)} ms${f.event?' · '+f.event:''}`;for(const b of $('stFrames').children)b.classList.toggle('selected',Number(b.dataset.index)===studio.selected);
 const arena=$('stArena').getContext('2d'),background=$('templeScenery');arena.clearRect(0,0,400,210);if(background?.width)arena.drawImage(background,0,0,400,210);const gameScale=130/(studio.entry.canvasHeight||f.h)*studio.entry.scale;studioPaint(arena,f,mirror?280:120,188,gameScale,1,mirror);if(f.event){arena.strokeStyle=f.event==='impact'?'#ffb64e':'#7befff';arena.lineWidth=3;arena.beginPath();arena.arc(mirror?210:190,130,16+Math.sin(now/60)*4,0,Math.PI*2);arena.stroke();}
 if(studioLive){studioLive.index=studio.selected;studioLive.time=studio.time;}
 }requestAnimationFrame(studioTick);
}requestAnimationFrame(studioTick);
let studioCanWrite=false;
async function studioCapabilities(){try{const r=await fetch('/api/project-sprites');studioCanWrite=r.ok&&(await r.json()).writable===true;}catch{studioCanWrite=false;}$('stSaveMode').textContent=studioCanWrite?'Projeto local conectado: Salvar também atualiza os arquivos do jogo.':'Modo navegador: Salvar aplica neste dispositivo. Baixar jogo pronto incorpora as animações em um HTML independente.';}
async function studioSave(){if(!studio.entry||studio.saving)return false;studio.saving=true;const revision=studio.revision;$('studioSave').disabled=true;try{const key=studioKey();Object.assign(customSprites,await validateSprites({version:1,sprites:{[key]:studio.entry}}));const message=await persistSprites();if(studioCanWrite){const r=await fetch('/api/project-sprites',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,sprites:customSprites})});if(!r.ok)throw Error('Aplicado no navegador; não foi possível gravar no projeto. Exporte o pacote.');}
 studio.dirty=studio.revision!==revision;studioRender();$('stStatus').textContent=studioCanWrite?'Animação salva no projeto e versões do jogo atualizadas.':message;return true;}catch(e){$('stStatus').textContent=e.message;return false;}finally{studio.saving=false;studioRender();}}
$('studioSave').onclick=studioSave;
$('stBattle').onclick=async()=>{if(!await studioSave())return;const side=$('stTarget').value;studioLive=null;$('studioDialog').close();$('labActor').value=side;if(side==='player'){$('labPlayer').value=$('stCharacter').value;$('labForm').value=$('stForm').value;}else{$('labOpponent').value=$('stCharacter').value;$('labEnemyForm').value=$('stForm').value;}updateLabSkills();reset();const selector=$(side==='player'?'labSkill':'labEnemySkill');if([...selector.options].some(o=>o.value===$('stClip').value)){selector.value=$('stClip').value;runLab();}else $('labStatus').textContent='Postura aplicada na arena.';};
$('stExport').onclick=async()=>{if(studio.dirty&&!await studioSave())return;$('spriteExport').click();$('stStatus').textContent='Pacote exportado com as animações aplicadas.';};
$('studioDownload').onclick=async()=>{try{if(studio.dirty&&!await studioSave())return;let html=await(await fetch(new URL('./index.html',location.href))).text();if(html.includes('src="/app.js"')){const r=await fetch('/jogo-pronto.html');if(!r.ok)throw Error('Não foi possível obter o jogo independente. Exporte o pacote.');html=await r.text();}if(!html.includes('const CARDS=')&&!html.includes('const CARDS ='))throw Error('Esta página não contém a versão independente.');const payload=JSON.stringify({version:1,sprites:customSprites}).replace(/</g,'\\u003c');html=html.replace('<script>','<script>window.__spritePackageId='+JSON.stringify(crypto.randomUUID())+';window.__spritePackage='+payload+';<\/script><script>');const url=URL.createObjectURL(new Blob([html],{type:'text/html'})),a=document.createElement('a');a.href=url;a.download='Kame-Duel-personalizado.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('stStatus').textContent='Jogo baixado com suas animações incorporadas. Abra o HTML para jogar.';}catch(e){$('stStatus').textContent=e.message;}};

async function playStudioVisual(side,key,token,entry){const actor=$(side==='player'?'goku':'vegeta'),target=$(side==='player'?'vegeta':'goku');actor.dataset.customClip=key;actor.dataset.customStart=String(animationClock.time);for(const i of customSequence(entry)){if(token!==generation)return;const f=entry.frames[i];if(f.event){target.classList.add('hit');$('effect').textContent=f.event==='impact'?'IMPACTO':'DISPARO';$('effect').classList.remove('show');void $('effect').offsetWidth;$('effect').classList.add('show');}await delay(f.duration);target.classList.remove('hit');}}
async function executeStudioAbility(side,index,token,entry){const key=state[side].hand[index],other=side==='player'?'enemy':'player';await playStudioVisual(side,key,token,entry);if(token!==generation)return;const hp=state[other].hp;play(state,side,index);clearBattleFx();busy=false;render();$('effect').textContent=hp>state[other].hp?'−'+(hp-state[other].hp):CARDS[key].name;$('effect').classList.remove('show');void $('effect').offsetWidth;$('effect').classList.add('show');if(state.winner&&!labMode){$('resultTitle').textContent=state.winner==='player'?'Você superou seus limites!':'O oponente venceu.';$('resultText').textContent=`Treino encerrado em ${state.round} rounds.`;$('resultDialog').showModal();}}

$('stNew').onclick=()=>{if(studio.dirty&&!confirm('Limpar o rascunho? Você pode desfazer depois.'))return;studioEdit(()=>{studio.frames=[];studio.selected=0;});};
