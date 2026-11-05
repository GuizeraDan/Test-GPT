export const CARDS={
 strike:{name:'Combo de golpes',type:'TÉCNICA',cost:1,actions:2,icon:'拳',description:'Causa 12 de dano.',damage:12},
 superBeam:{name:'Super Kamehameha',type:'TÉCNICA',cost:8,actions:2,icon:'波',description:'Libera um feixe massivo. Causa 80 de dano.',damage:80},
 blast:{name:'Rajada de ki',type:'TÉCNICA',cost:2,icon:'✦',description:'Dispara 4 rajadas de 5 de dano. Total: 20.',damage:20,hits:4},
 beam:{name:'Kamehameha',type:'TÉCNICA',cost:4,actions:2,icon:'波',description:'Causa 50 de dano. Concentra ki e dispara um feixe azul.',damage:50},
 kienzan:{name:'Kienzan',type:'HABILIDADE',cost:3,actions:2,icon:'◒',description:'Lança 3 discos de energia. Causa 40 de dano no total.',damage:40,projectiles:3},
 charge:{name:'Concentrar ki',type:'HABILIDADE',cost:0,icon:'気',description:'Recupera 2 de ki. Consome uma ação.',ki:2},
 guard:{name:'Postura defensiva',type:'HABILIDADE',cost:1,icon:'盾',description:'Recebe 18 de escudo até seu próximo turno.',shield:18},
 evade:{name:'Reflexo veloz',type:'REAÇÃO',cost:1,icon:'↯',description:'Prepara uma reação: reduz o próximo ataque em 15.',reaction:15},
 gogeta:{name:'Gogeta Super Sayajin',type:'TRANSFORMAÇÃO',cost:4,actions:1,icon:'融',description:'Transforma em Gogeta SSJ. +8 de dano; 1 ki por turno.',transform:true,form:'gogetaSSJ'},
 transform:{name:'Super Saiyajin',type:'TRANSFORMAÇÃO',cost:4,icon:'炎',description:'+8 de dano nos ataques. Custa 1 de ki por turno.',transform:true}
};
const sequence=['superBeam','strike','charge','guard','blast','beam','kienzan','evade','transform','gogeta','strike','blast','guard','charge','beam','evade','strike'];
function shuffle(a,rng){for(let i=a.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function fighter(name,rng){return {name,hp:100,ki:3,shield:0,reaction:0,transformed:false,form:null,deck:shuffle([...sequence],rng),discard:[],hand:['strike','charge','evade','transform']};}
export function createGame(rng=Math.random){return {player:fighter('Goku',rng),enemy:fighter('Vegeta',rng),turn:'player',round:1,actions:2,winner:null,log:['Treino no templo! Você começa com 2 ações.']};}
function note(s,t){s.log.push(t);if(s.log.length>40)s.log.shift();}
export function canPlay(s,side,index){const f=s[side],c=CARDS[f.hand[index]];return !s.winner&&!s.pendingBurst&&s.turn===side&&!!c&&s.actions>=(c.actions||1)&&f.ki>=c.cost&&!(c.transform&&(c.form==='gogetaSSJ'?f.form==='gogetaSSJ':f.transformed))&&!(c.reaction&&f.reaction);}
export function play(s,side,index){if(!canPlay(s,side,index))return false;if(s[side].hand[index]==='blast'){if(!beginBurst(s,side,index))return false;while(s.pendingBurst)resolveBurstHit(s);return true;}const f=s[side],target=s[side==='player'?'enemy':'player'],key=f.hand[index],c=CARDS[key];f.hand.splice(index,1);f.discard.push(key);f.ki-=c.cost;s.actions-=c.actions||1;let detail='';if(c.damage){let damage=c.damage+(f.transformed?8:0);const reaction=Math.min(damage,target.reaction);damage-=reaction;target.reaction=0;const block=Math.min(damage,target.shield);damage-=block;target.shield-=block;target.hp=Math.max(0,target.hp-damage);detail=` ${damage} de dano${reaction+block?` (${reaction+block} bloqueado)` :''}.`;if(!target.hp){s.winner=side;note(s,`${f.name} venceu o treino!`);}}if(c.ki)f.ki=Math.min(8,f.ki+c.ki);if(c.shield)f.shield+=c.shield;if(c.reaction)f.reaction=c.reaction;if(c.transform){f.transformed=true;f.form=c.form||'ssj';}note(s,`${f.name}: ${side==='enemy'&&key==='beam'?'Galick Ho':c.name}.${detail}`);return true;}
export function endTurn(s,rng=Math.random){if(s.winner||s.pendingBurst)return; s.turn=s.turn==='player'?'enemy':'player';if(s.turn==='player')s.round++;const f=s[s.turn];f.shield=0;f.ki=Math.min(8,f.ki+2);if(f.transformed){f.ki--;note(s,`${f.name} gasta 1 ki mantendo a transformação.`);}for(let i=0;i<2&&f.hand.length<7;i++){if(!f.deck.length)f.deck=shuffle(f.discard.splice(0),rng);if(f.deck.length)f.hand.push(f.deck.pop());}s.actions=2;note(s,`Turno de ${f.name}: +2 ki e até 2 cartas.`);}
export function chooseEnemy(s){let best=-1,score=-Infinity;s.enemy.hand.forEach((key,i)=>{if(!canPlay(s,'enemy',i))return;const c=CARDS[key];let value=c.damage?c.damage+(s.enemy.transformed?8:0):c.ki?(s.enemy.ki<4?24:2):c.transform?26:c.shield?(s.enemy.hp<45?23:10):12;if(value>score){best=i;score=value;}});return best;}

export function beginBurst(s,side,index){
 if(!canPlay(s,side,index)||s[side].hand[index]!=='blast')return false;
 const f=s[side],c=CARDS.blast;f.hand.splice(index,1);f.discard.push('blast');f.ki-=c.cost;s.actions-=c.actions||1;
 s.pendingBurst={side,hit:0,hits:c.hits,damage:(c.damage+(f.transformed?8:0))/c.hits};return true;
}
export function resolveBurstHit(s){
 const burst=s.pendingBurst;if(!burst)return null;
 const target=s[burst.side==='player'?'enemy':'player'];let damage=burst.damage;
 const reaction=Math.min(damage,target.reaction);damage-=reaction;target.reaction=0;
 const shield=Math.min(damage,target.shield);damage-=shield;target.shield-=shield;
 const before=target.hp;target.hp=Math.max(0,target.hp-damage);burst.hit++;
 const result={hit:burst.hit,damage:before-target.hp,blocked:reaction+shield,hp:target.hp};
 note(s,`${s[burst.side].name}: Rajada de ki ${burst.hit}/${burst.hits} — ${result.damage} de dano${result.blocked?' ('+result.blocked+' bloqueado)':''}.`);
 if(burst.hit===burst.hits){if(!target.hp){s.winner=burst.side;note(s,`${s[burst.side].name} venceu o treino!`);}s.pendingBurst=null;}
 return result;
}
