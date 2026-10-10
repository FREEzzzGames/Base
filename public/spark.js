/* SPARK runtime — extracted from spark.html. Subsystems are marked below. */
(function(){
'use strict';var $=function(id){return document.getElementById(id)},canvas=$('game'),ctx=canvas.getContext('2d'),W=360,H=640,dpr=1,scale=1,ox=0,oy=0;
var levelW=2600,ground=565,worldH=960,cam=0,camY=0,state='MENU',last=0,acc=0,timers=[],fx=[],bullets=[],enemies=[],selectedLevel=0,levelTheme=0,bossHomeX=2310,levelAI='balanced',bossAI='mecha',keys={left:false,right:false,jump:false,jumpEdge:false,attack:false,attackEdge:false,interactEdge:false,skill:false,skillEdge:false};
// DATA: playable characters, weapons, player state, pickups and level geometry.
var CHARACTERS=SparkData.CHARACTERS;var selectedCharacter=CHARACTERS[0];var p=SparkData.createPlayer(ground);
var WEAPONS=SparkData.WEAPONS;var worldShake=0,worldShakeX=0,worldShakeY=0;var pickups=[],pickupRespawns=[],pickupClock=0;var pickupDefs=[{t:'medkit',s:25,x:190,y:ground-30},{t:'energy',s:35,x:560,y:ground-35},{t:'medkit',s:35,x:820,y:ground-30},{t:'energy',s:45,x:1125,y:ground-35},{t:'medkit',s:25,x:1390,y:ground-30},{t:'medkit',s:60,x:1680,y:ground-30},{t:'energy',s:50,x:1810,y:235},{t:'medkit',s:60,x:2150,y:ground-30},{t:'medkit',s:35,x:2480,y:ground-30},{t:'energy',s:40,x:1260,y:220},{t:'medkit',s:25,x:72,y:420},{t:'medkit',s:25,x:218,y:360},{t:'medkit',s:35,x:354,y:300},{t:'medkit',s:25,x:665,y:295},{t:'medkit',s:35,x:808,y:240},{t:'medkit',s:25,x:984,y:320},{t:'medkit',s:35,x:1280,y:215},{t:'medkit',s:25,x:1442,y:160},{t:'medkit',s:35,x:1735,y:280},{t:'medkit',s:25,x:2010,y:150},{t:'medkit',s:35,x:2160,y:90},{t:'medkit',s:60,x:2315,y:35},{t:'medkit',s:25,x:2455,y:100},{t:'medkit',s:35,x:1540,y:100},{t:'medkit',s:25,x:1860,y:90},{t:'energy',s:30,x:380,y:ground-35},{t:'energy',s:35,x:940,y:300},{t:'energy',s:40,x:1510,y:130},{t:'energy',s:35,x:2040,y:145},{t:'energy',s:50,x:2390,y:ground-35}];function initPickups(){pickupRespawns=[];pickupClock=0;pickups=pickupDefs.filter(function(q){return q.x<levelW-24}).map(function(q){return Object.assign({},q,{y:q.y===565-35?ground-35:q.y,bob:Math.random()*6.28,spin:Math.random()*6.28,taken:false,wid:16.8,h:16.8})})}function updatePickups(dt){pickupClock+=dt;for(var ri=pickupRespawns.length-1;ri>=0;ri--){var rq=pickupRespawns[ri];if(rq.at<=pickupClock){pickups.push(Object.assign({},rq.def,{bob:Math.random()*6.28,spin:Math.random()*6.28,taken:false,wid:16.8,h:16.8}));pickupRespawns.splice(ri,1)}}for(var i=pickups.length-1;i>=0;i--){var q=pickups[i];if(q.taken){pickupRespawns.push({def:{t:q.t,s:q.s,x:q.x,y:q.y,w:q.w},at:pickupClock+10+Math.random()*6});pickups.splice(i,1);continue}q.bob+=dt*3;q.spin+=dt*1.7;if(Math.hypot(p.x+p.w/2-(q.x+12),p.y+p.h/2-(q.y+12))<25){if(q.t==='energy'){if(p.en>=100)continue;p.en=Math.min(100,p.en+q.s);beep(820,.09);toast('ЭНЕРГИЯ +'+q.s)}else if(q.t==='medkit'&&p.hp<100){p.hp=Math.min(100,p.hp+q.s);beep(700,.1);toast('АПТЕЧКА +'+q.s+' HP')}else continue;q.taken=true}}}function drawPickups(){pickups.forEach(function(q){if(q.taken)return;var bobY=Math.sin(q.bob)*3.5,col=q.t==='energy'?'#55dff3':q.t==='weapon'?WEAPONS[q.w].color:'#ffb34b',cx=q.x+12,cy=q.y+12+bobY,r=8.4;ctx.save();ctx.translate(-cam,-camY);
 // Small rotating circular capsule, with a restrained neon halo.
 ctx.fillStyle='rgba(0,0,0,.42)';ctx.beginPath();ctx.ellipse(cx, q.y+27, 7, 1.5, 0, 0, Math.PI*2);ctx.fill();
 ctx.globalAlpha=.13;ctx.fillStyle=col;ctx.beginPath();ctx.arc(cx,cy,r+4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 ctx.translate(cx,cy);ctx.rotate(q.spin);ctx.fillStyle='#0c1625';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1c2b3e';ctx.beginPath();ctx.arc(0,0,r-1.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=1.35;ctx.beginPath();ctx.arc(0,0,r-.5,0,Math.PI*2);ctx.stroke();
 ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-4.5,-3.5);ctx.lineTo(4.5,-3.5);ctx.moveTo(-4.5,3.5);ctx.lineTo(4.5,3.5);ctx.stroke();
 if(q.t==='weapon'){ctx.fillStyle=col;ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(WEAPONS[q.w].icon,0,0)}else if(q.t==='energy'){ctx.fillStyle='#d9fbff';ctx.beginPath();ctx.moveTo(1,-5);ctx.lineTo(-3,1);ctx.lineTo(0,1);ctx.lineTo(-1,5);ctx.lineTo(4,-2);ctx.lineTo(1,-2);ctx.closePath();ctx.fill()}else{ctx.fillStyle='#f2f5f2';ctx.fillRect(-1.5,-4,3,8);ctx.fillRect(-4,-1.5,8,3);ctx.fillStyle='#ff5961';ctx.fillRect(-.7,-3,1.4,6);ctx.fillRect(-3,.0,6,1.4)}
 ctx.restore()})}var platforms=[{x:0,y:ground,w:2600,h:210},{x:45,y:450,w:115,h:12},{x:190,y:390,w:110,h:12},{x:325,y:330,w:125,h:12},{x:490,y:385,w:135,h:12},{x:635,y:325,w:135,h:12},{x:780,y:270,w:150,h:12},{x:950,y:350,w:130,h:12},{x:1095,y:300,w:140,h:12},{x:1250,y:245,w:150,h:12},{x:1415,y:330,w:135,h:12},{x:1575,y:375,w:125,h:12},{x:1715,y:310,w:130,h:12},{x:1810,y:250,w:105,h:12},{x:1955,y:385,w:135,h:12},{x:2105,y:325,w:130,h:12},{x:2250,y:275,w:150,h:12},{x:2420,y:340,w:140,h:12},{x:1635,y:435,w:150,h:12},{x:1730,y:405,w:90,h:12},{x:1410,y:190,w:125,h:12},{x:1550,y:130,w:125,h:12},{x:1690,y:70,w:125,h:12},{x:1835,y:120,w:125,h:12},{x:1980,y:180,w:125,h:12},{x:2125,y:120,w:125,h:12},{x:2280,y:65,w:125,h:12},{x:2440,y:130,w:115,h:12}],consoles=[{x:250,y:ground},{x:960,y:ground},{x:1600,y:ground},{x:2180,y:ground}],boss={x:2310,y:ground-104,w:144,h:104,hp:540,maxHp:540,active:false,dead:false,cd:2,phase:1,attack:0};
// VIEWPORT: fixed 360×640 logical canvas with device-pixel-ratio scaling.
function resize(){W=360;H=640;var view=SparkViewport.resize(canvas,W,H);dpr=view.dpr;scale=view.scale;ox=view.offsetX;oy=view.offsetY}
addEventListener('resize',resize,{passive:true});addEventListener('orientationchange',function(){setTimeout(resize,100)},{passive:true});
if(window.visualViewport)window.visualViewport.addEventListener('resize',resize,{passive:true});
if(window.Telegram&&window.Telegram.WebApp&&typeof window.Telegram.WebApp.onEvent==='function'){window.Telegram.WebApp.onEvent('viewportChanged',resize);window.Telegram.WebApp.onEvent('safeAreaChanged',resize);}
// UI / HUB: menu rendering and screen navigation.
function renderCharacterSelector(){var grid=$('characterGrid');if(!grid)return;grid.innerHTML='';CHARACTERS.forEach(function(c){var b=document.createElement('button');b.type='button';b.className='character-card'+(c.id===selectedCharacter.id?' selected':'');b.style.setProperty('--char',c.color);b.innerHTML='<svg viewBox="0 0 48 62" aria-hidden="true"><path d="M10 25 Q3 5 22 5 Q41 3 39 26 L36 32 L12 32Z" fill="'+c.hair+'" stroke="#172131" stroke-width="2"/><rect x="12" y="19" width="24" height="17" rx="6" fill="'+c.skin+'" stroke="#172131" stroke-width="2"/><path d="M10 20 Q24 13 38 20 L36 25 L12 25Z" fill="'+c.hair+'"/><rect x="16" y="26" width="4" height="3" rx="1" fill="#172131"/><rect x="28" y="26" width="4" height="3" rx="1" fill="#172131"/><path d="M9 39 L39 39 L42 52 L6 52Z" fill="'+c.coat+'" stroke="#172131" stroke-width="2"/><path d="M14 52 L23 52 L22 60 L13 60Z M26 52 L35 52 L36 60 L27 60Z" fill="'+c.pants+'" stroke="#172131" stroke-width="2"/></svg><span>'+c.name+'</span><div class="shot"></div>';grid.appendChild(b)});var note=$('characterNote');if(note){note.textContent=selectedCharacter.name+' · '+selectedCharacter.desc;note.style.color=selectedCharacter.color}var pa=$('profileAvatar'),sa=$('selectedAvatar'),pn=$('profileName');if(pa){pa.textContent=selectedCharacter.name==='NARU'?'忍':selectedCharacter.name.slice(0,1);pa.style.borderColor=selectedCharacter.color}if(sa){sa.textContent=selectedCharacter.name==='NARU'?'忍':selectedCharacter.name.slice(0,1);sa.style.borderColor=selectedCharacter.color;sa.style.color=selectedCharacter.color}if(pn)pn.textContent=selectedCharacter.name;var pda=$('profileDetailAvatar'),pdn=$('profileDetailName');if(pda){pda.textContent=selectedCharacter.symbol||'忍';pda.style.borderColor=selectedCharacter.color;pda.style.boxShadow='0 0 18px '+selectedCharacter.color+'55'}if(pdn)pdn.textContent=selectedCharacter.name;}function resetInput(){Object.keys(keys).forEach(function(k){keys[k]=false});if(typeof stickPid!=='undefined')stopStick();document.querySelectorAll('[data-act]').forEach(function(b){b.classList.remove('on')})}

function showScreen(name){document.querySelectorAll('.hub-screen').forEach(function(el){el.classList.toggle('active',el.dataset.screen===name)});document.querySelectorAll('.nav-item').forEach(function(el){el.classList.toggle('active',el.dataset.goto===name)});$('hubScroll').scrollTop=0;if(name==='weapons')renderWeapons();if(name==='characters')renderCharacterSelector();$('hubScrap').textContent=p.scrap}
function renderWeapons(){var grid=$('weaponsGrid');if(!grid)return;grid.innerHTML='';Object.keys(WEAPONS).forEach(function(key){var w=WEAPONS[key],b=document.createElement('button');b.className='weapon-card'+(selectedWeapon===key?' selected':'');b.style.setProperty('--wc',w.color);b.innerHTML='<span class="weapon-icon">'+w.icon+'</span><span><b>'+w.name+'</b><small>Урон '+w.dmg+' · '+(1/w.cd).toFixed(1)+'/с</small></span>';grid.appendChild(b)})}

// UI / EVENTS: bind menu, pause, keyboard and touch controls once at boot.
$('profileName').parentElement.parentElement.addEventListener('click',function(){showScreen('profile')});
$('pauseExit').addEventListener('click',function(){$('pauseMenu').classList.add('hidden');$('exitConfirm').classList.remove('hidden')});
$('exitCancel').addEventListener('click',function(){$('exitConfirm').classList.add('hidden');$('pauseMenu').classList.remove('hidden')});
$('exitConfirmBtn').addEventListener('click',function(){$('exitConfirm').classList.add('hidden');$('hud').classList.add('hidden');$('controls').classList.add('hidden');$('menu').classList.remove('hidden');state='MENU';showScreen('home');resetInput()});
$('pauseButton').addEventListener('click',pauseGame);
$('resume').addEventListener('click',resumeGame);
$('pauseRestart').addEventListener('click',function(){ $('pauseMenu').classList.add('hidden');reset()});
$('pauseHome').addEventListener('click',function(){ $('pauseMenu').classList.add('hidden');$('hud').classList.add('hidden');$('controls').classList.add('hidden');$('menu').classList.remove('hidden');state='MENU';showScreen('home');resetInput()});
function pauseGame(){if(state!=='PLAY')return;state='PAUSED';resetInput();$('pauseMenu').classList.remove('hidden')}
function resumeGame(){if(state!=='PAUSED')return;$('pauseMenu').classList.add('hidden');state='PLAY';SparkSimulation.resetClock();last=0;acc=0}
var map={left:['ArrowLeft','a'],right:['ArrowRight','d'],jump:['ArrowUp','w',' '],attack:['j','k'],interact:['e','Enter'],skill:['Shift','l'],weaponPrev:['q','Q'],weaponNext:['r','R']};
addEventListener('keydown',function(e){Object.keys(map).forEach(function(k){if(map[k].indexOf(e.key)>-1){e.preventDefault();if(k==='jump'&&!keys.jump)keys.jumpEdge=true;if(k==='attack'){keys.attackEdge=true;keys.attack=true}if(k==='interact')keys.interactEdge=true;if(k==='skill')keys.skillEdge=true;if(k==='weaponPrev'){cycleWeapon(-1);return}if(k==='weaponNext'){cycleWeapon(1);return}keys[k]=true}})});
addEventListener('keyup',function(e){Object.keys(map).forEach(function(k){if(map[k].indexOf(e.key)>-1){keys[k]=false;if(k==='attack')keys.attack=false}})});addEventListener('blur',resetInput);
$('weaponPrev').addEventListener('click',function(e){e.preventDefault();e.stopPropagation();cycleWeapon(-1)});$('weaponNext').addEventListener('click',function(e){e.preventDefault();e.stopPropagation();cycleWeapon(1)});
document.querySelectorAll('[data-act]').forEach(function(b){var a=b.dataset.act;function down(e){e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(_){}if(a==='jump'&&!keys.jump)keys.jumpEdge=true;if(a==='attack'){keys.attackEdge=true;keys.attack=true}if(a==='interact')keys.interactEdge=true;if(a==='skill')keys.skillEdge=true;keys[a]=true;b.classList.add('on')}function up(e){e.preventDefault();keys[a]=false;if(a==='attack')keys.attack=false;b.classList.remove('on')}b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up)});var stick=$('moveStick'),knob=$('stickKnob'),stickPid=null,stickRect=null;function moveStick(e){var r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,lim=r.width*.31,len=Math.hypot(dx,dy);if(len>lim){dx=dx/len*lim;dy=dy/len*lim}knob.style.left='calc(50% + '+dx+'px)';knob.style.top='calc(50% + '+dy+'px)';keys.left=dx < -lim*.18;keys.right=dx > lim*.18;}function stopStick(e){if(stickPid!==null&&(!e||e.pointerId===stickPid)){stickPid=null;keys.left=keys.right=false;knob.style.left='50%';knob.style.top='50%'}}stick.addEventListener('pointerdown',function(e){e.preventDefault();stickPid=e.pointerId;try{stick.setPointerCapture(e.pointerId)}catch(_){}moveStick(e)});stick.addEventListener('pointermove',function(e){if(e.pointerId===stickPid){e.preventDefault();moveStick(e)}});stick.addEventListener('pointerup',stopStick);stick.addEventListener('pointercancel',stopStick);stick.addEventListener('lostpointercapture',stopStick);
var soundEnabled=true,selectedWeapon='pistol';function setWeapon(key){if(!WEAPONS[key])return;selectedWeapon=key;p.weapon=key;var we=$('weapon');if(we){we.textContent='▸ '+WEAPONS[key].name;we.style.color=WEAPONS[key].color}document.querySelectorAll('.weapon-switch').forEach(function(b){b.classList.remove('pulse');void b.offsetWidth;b.classList.add('pulse')})}function cycleWeapon(step){var list=Object.keys(WEAPONS),i=list.indexOf(p.weapon);setWeapon(list[(i+step+list.length)%list.length]);beep(620,.045)}function beep(f,d,type){SparkAudio.beep(soundEnabled,f,d,type)}
// Lifecycle-owned timers: terminal callbacks cannot leak into the next run.
function later(fn,ms){return SparkSession.later(fn,ms)}
function clearTimers(){SparkSession.clearTimers();timers.length=0}
function clearToastTimer(){if(toast.id){clearTimeout(toast.id);toast.id=0}}
// SESSION: rebuild level state and clear session-scoped work before every run.
function reset(){clearTimers();clearToastTimer();resetInput();worldShake=worldShakeX=worldShakeY=0;p.x=30;p.y=ground-p.h;camY=0;p.vx=p.vy=0;p.hp=p.en=100;p.scrap=0;p.weapon=selectedWeapon;initPickups();p.inv=p.atk=p.cd=p.dashCd=p.dash=p.shield=p.shieldCd=0;p.dead=false;p.onGround=false;p.coyote=p.jbuf=0;p.face=1;p.anim=0;p._gaitPhase=0;p._hitReact=0;p._landPulse=0;p._blockPulse=0;cam=0;bullets=[];fx=[];boss.x=2310;boss.y=ground-boss.h;boss.hp=boss.maxHp;boss.active=boss.dead=false;boss.cd=2;boss.phase=1;boss.attack=0;boss.moveT=0;boss.prevMoveX=boss.x;boss.prevMoveY=boss.y;boss.visualVx=boss.visualVy=0;boss.dashT=0;boss.dashWindow=-1;boss.dashDir=1;boss.recoil=0;enemies=[{type:'soldier',x:255,y:ground-42,w:42,h:42,x1:220,x2:390,v:34,hp:48,maxHp:48,cd:1.6},{type:'runner',x:535,y:ground-40,w:40,h:40,x1:500,x2:650,v:52,hp:42,maxHp:42,cd:1.3},{type:'soldier',x:700,y:325-42,w:42,h:42,x1:650,x2:755,v:28,hp:52,maxHp:52,cd:1.7},{type:'drone',x:865,y:230,w:42,h:30,base:230,t:0,hp:42,maxHp:42,cd:1.5},{type:'turret',x:1010,y:ground-36,w:48,h:36,hp:64,maxHp:64,cd:1.5},{type:'sniper',x:1160,y:300-44,w:44,h:44,x1:1100,x2:1230,v:12,hp:55,maxHp:55,cd:2.2},{type:'shield',x:1450,y:ground-48,w:48,h:48,x1:1400,x2:1530,v:20,hp:95,maxHp:95,cd:1.7},{type:'runner',x:1650,y:ground-40,w:40,h:40,x1:1580,x2:1770,v:55,hp:42,maxHp:42,cd:1.3},{type:'sniper',x:1775,y:250-44,w:44,h:44,x1:1720,x2:1830,v:10,hp:55,maxHp:55,cd:2.2},{type:'turret',x:2050,y:ground-36,w:48,h:36,hp:72,maxHp:72,cd:1.5},{type:'soldier',x:2200,y:ground-42,w:42,h:42,x1:2160,x2:2260,v:28,hp:62,maxHp:62,cd:1.5} ,{type:'sniper',x:1440,y:146,w:44,h:44,x1:1418,x2:1490,v:12,hp:60,maxHp:60,cd:2.0},{type:'shield',x:1580,y:86,w:48,h:48,x1:1558,x2:1625,v:16,hp:92,maxHp:92,cd:1.8},{type:'drone',x:1725,y:28,w:42,h:30,base:28,t:0,hp:46,maxHp:46,cd:1.4},{type:'runner',x:1860,y:76,w:40,h:40,x1:1845,x2:1908,v:36,hp:48,maxHp:48,cd:1.5},{type:'sniper',x:2150,y:76,w:44,h:44,x1:2135,x2:2200,v:12,hp:64,maxHp:64,cd:1.8},{type:'shield',x:2310,y:21,w:48,h:48,x1:2290,x2:2350,v:16,hp:100,maxHp:100,cd:1.7}];
 // Each operation has its own route, enemy roster, arena length and boss tuning.
 var levelSpecs=[
  {name:'ЦЕНТРАЛЬНЫЙ КОМПЛЕКС',w:2600,ground:565,theme:0,boss:2310,hp:540,ai:'balanced',bossAI:'mecha'},
  {name:'КРЫШИ ДЕРЕВНИ',w:2240,ground:565,theme:1,boss:1960,hp:610,ai:'airborne',bossAI:'aerial'},
  {name:'ПРОМЗОНА',w:2460,ground:565,theme:2,boss:2170,hp:720,ai:'pressure',bossAI:'siege'},
  {name:'СЕКРЕТНАЯ БАЗА',w:2180,ground:565,theme:3,boss:1900,hp:820,ai:'ambush',bossAI:'phase'}
 ];
 var spec=levelSpecs[selectedLevel]||levelSpecs[0];levelW=spec.w;ground=spec.ground;levelTheme=spec.theme;bossHomeX=spec.boss;levelAI=spec.ai;bossAI=spec.bossAI;
 var layouts=[
  // 0 — Central Complex: broad city roofs, broken stair-stepping and a high neon skyline.
  [{x:0,y:565,w:2600,h:210},{x:55,y:475,w:135,h:12},{x:220,y:420,w:105,h:12},{x:350,y:355,w:150,h:12},{x:520,y:410,w:110,h:12},{x:655,y:345,w:140,h:12},{x:820,y:285,w:135,h:12},{x:980,y:350,w:125,h:12},{x:1125,y:295,w:150,h:12},{x:1300,y:235,w:140,h:12},{x:1465,y:305,w:125,h:12},{x:1610,y:365,w:145,h:12},{x:1780,y:305,w:130,h:12},{x:1935,y:245,w:135,h:12},{x:2095,y:315,w:125,h:12},{x:2245,y:260,w:145,h:12},{x:2420,y:335,w:130,h:12},{x:500,y:285,w:90,h:12},{x:650,y:220,w:100,h:12},{x:800,y:165,w:105,h:12},{x:960,y:205,w:100,h:12},{x:1110,y:150,w:110,h:12},{x:1270,y:185,w:95,h:12},{x:1430,y:125,w:110,h:12},{x:1590,y:165,w:100,h:12},{x:1760,y:115,w:110,h:12},{x:1930,y:155,w:100,h:12},{x:2100,y:105,w:110,h:12},{x:2280,y:145,w:120,h:12}],
  // 1 — Village roofs: stepped eaves, narrow ridge crossings and a high pagoda route.
  [{x:0,y:565,w:2240,h:210},{x:35,y:485,w:125,h:12},{x:190,y:430,w:100,h:12},{x:320,y:365,w:115,h:12},{x:465,y:415,w:100,h:12},{x:595,y:350,w:115,h:12},{x:740,y:285,w:110,h:12},{x:880,y:340,w:100,h:12},{x:1010,y:275,w:115,h:12},{x:1155,y:210,w:105,h:12},{x:1290,y:270,w:110,h:12},{x:1430,y:335,w:100,h:12},{x:1560,y:270,w:115,h:12},{x:1705,y:205,w:105,h:12},{x:1840,y:145,w:110,h:12},{x:1980,y:215,w:100,h:12},{x:2110,y:285,w:95,h:12},{x:460,y:285,w:90,h:12},{x:585,y:220,w:95,h:12},{x:715,y:155,w:100,h:12},{x:850,y:105,w:95,h:12},{x:980,y:145,w:95,h:12},{x:1110,y:90,w:100,h:12},{x:1245,y:135,w:95,h:12},{x:1380,y:85,w:100,h:12},{x:1515,y:125,w:95,h:12},{x:1650,y:70,w:100,h:12},{x:1785,y:105,w:95,h:12},{x:1915,y:65,w:100,h:12}],
  // 2 — Industrial zone: conveyor decks, heavy spans and alternating upper catwalks.
  [{x:0,y:565,w:2460,h:210},{x:65,y:485,w:160,h:12},{x:265,y:485,w:105,h:12},{x:405,y:415,w:150,h:12},{x:590,y:415,w:95,h:12},{x:720,y:345,w:155,h:12},{x:910,y:345,w:105,h:12},{x:1050,y:425,w:155,h:12},{x:1240,y:425,w:100,h:12},{x:1380,y:345,w:155,h:12},{x:1570,y:345,w:100,h:12},{x:1710,y:265,w:160,h:12},{x:1905,y:265,w:100,h:12},{x:2045,y:345,w:145,h:12},{x:2220,y:285,w:150,h:12},{x:180,y:355,w:105,h:12},{x:330,y:285,w:105,h:12},{x:490,y:215,w:110,h:12},{x:655,y:245,w:105,h:12},{x:820,y:175,w:120,h:12},{x:1000,y:215,w:105,h:12},{x:1165,y:155,w:120,h:12},{x:1345,y:205,w:105,h:12},{x:1510,y:145,w:115,h:12},{x:1685,y:175,w:105,h:12},{x:1850,y:115,w:115,h:12},{x:2025,y:165,w:105,h:12},{x:2190,y:105,w:120,h:12}],
  // 3 — Secret base: vault ledges, narrow transfer platforms and deep vertical shafts.
  [{x:0,y:565,w:2180,h:210},{x:45,y:485,w:145,h:12},{x:225,y:420,w:120,h:12},{x:385,y:465,w:100,h:12},{x:525,y:390,w:145,h:12},{x:705,y:325,w:125,h:12},{x:865,y:375,w:105,h:12},{x:1010,y:305,w:145,h:12},{x:1190,y:240,w:125,h:12},{x:1350,y:300,w:105,h:12},{x:1495,y:225,w:145,h:12},{x:1675,y:165,w:125,h:12},{x:1835,y:225,w:105,h:12},{x:1980,y:155,w:145,h:12},{x:255,y:330,w:95,h:12},{x:405,y:265,w:105,h:12},{x:565,y:205,w:100,h:12},{x:720,y:155,w:110,h:12},{x:885,y:205,w:100,h:12},{x:1040,y:145,w:110,h:12},{x:1205,y:100,w:100,h:12},{x:1360,y:145,w:100,h:12},{x:1515,y:85,w:105,h:12},{x:1680,y:105,w:100,h:12},{x:1835,y:65,w:105,h:12}]
 ];
 platforms.splice.apply(platforms,[0,platforms.length].concat(layouts[selectedLevel].map(function(q){return {x:q.x,y:q.y,w:q.w,h:q.h}})));p.y=ground-p.h;initPickups();
 var rosters=[
  enemies,
  [{type:'soldier',x:230,y:405-42,w:42,h:42,x1:200,x2:285,v:38,hp:55,maxHp:55,cd:1.4},{type:'drone',x:475,y:245,w:42,h:30,base:245,t:0,hp:48,maxHp:48,cd:1.2},{type:'runner',x:760,y:380-40,w:40,h:40,x1:720,x2:830,v:58,hp:50,maxHp:50,cd:1.1},{type:'sniper',x:1015,y:270-44,w:44,h:44,x1:990,x2:1090,v:12,hp:62,maxHp:62,cd:1.8},{type:'drone',x:1245,y:150,w:42,h:30,base:150,t:0,hp:52,maxHp:52,cd:1.2},{type:'shield',x:1515,y:565-48,w:48,h:48,x1:1480,x2:1610,v:20,hp:105,maxHp:105,cd:1.6},{type:'runner',x:1800,y:205-40,w:40,h:40,x1:1770,x2:1880,v:62,hp:55,maxHp:55,cd:1.2},{type:'turret',x:2020,y:565-36,w:48,h:36,hp:80,maxHp:80,cd:1.3}],
  [{type:'turret',x:320,y:565-36,w:48,h:36,hp:85,maxHp:85,cd:1.2},{type:'shield',x:610,y:565-48,w:48,h:48,x1:580,x2:760,v:18,hp:120,maxHp:120,cd:1.5},{type:'runner',x:820,y:295-40,w:40,h:40,x1:850,x2:980,v:58,hp:58,maxHp:58,cd:1.2},{type:'sniper',x:1090,y:380-44,w:44,h:44,x1:1050,x2:1160,v:12,hp:68,maxHp:68,cd:1.6},{type:'turret',x:1320,y:565-36,w:48,h:36,hp:90,maxHp:90,cd:1.1},{type:'drone',x:1540,y:170,w:42,h:30,base:170,t:0,hp:58,maxHp:58,cd:1.1},{type:'shield',x:1770,y:565-48,w:48,h:48,x1:1730,x2:1900,v:16,hp:135,maxHp:135,cd:1.4},{type:'sniper',x:2040,y:170-44,w:44,h:44,x1:2010,x2:2100,v:10,hp:75,maxHp:75,cd:1.5}],
  [{type:'shield',x:260,y:565-48,w:48,h:48,x1:230,x2:360,v:16,hp:135,maxHp:135,cd:1.4},{type:'sniper',x:560,y:395-44,w:44,h:44,x1:540,x2:630,v:10,hp:72,maxHp:72,cd:1.5},{type:'drone',x:800,y:210,w:42,h:30,base:210,t:0,hp:62,maxHp:62,cd:1.1},{type:'turret',x:980,y:565-36,w:48,h:36,hp:105,maxHp:105,cd:1.1},{type:'runner',x:1240,y:250-40,w:40,h:40,x1:1190,x2:1320,v:64,hp:65,maxHp:65,cd:1.1},{type:'sniper',x:1460,y:245-44,w:44,h:44,x1:1440,x2:1510,v:10,hp:80,maxHp:80,cd:1.4},{type:'drone',x:1700,y:120,w:42,h:30,base:120,t:0,hp:70,maxHp:70,cd:1.0},{type:'turret',x:1900,y:565-36,w:48,h:36,hp:120,maxHp:120,cd:1.0}]
 ];
 if(selectedLevel>0)enemies=rosters[selectedLevel];
 consoles=[{x:250,y:ground},{x:960,y:ground},{x:1600,y:ground},{x:2180,y:ground}].filter(function(c){return c.x<levelW-100});
 boss.x=spec.boss;boss.y=ground-boss.h;boss.hp=boss.maxHp=spec.hp;boss.active=boss.dead=false;boss.cd=2;boss.phase=1;boss.attack=0;
 SparkSimulation.resetClock();last=0;acc=0;state='PLAY';$('menu').classList.add('hidden');$('pauseMenu').classList.add('hidden');$('over').classList.add('hidden');$('win').classList.add('hidden');$('hud').classList.remove('hidden');$('controls').classList.remove('hidden');$('bossMeter').style.display='none';hud()}
// PHYSICS: collision tests, projectiles, damage and fixed-step simulation.
function hit(a,b){return SparkPhysics.hit(a,b)}
function collide(e,dt){var oldX=e.x,oldY=e.y,oldBottom=oldY+e.h;e.onGround=false;e.y+=e.vy*dt;platforms.forEach(function(q){if(e.x<q.x+q.w&&e.x+e.w>q.x&&e.y<q.y+q.h&&e.y+e.h>q.y){if(e.vy>=0&&oldBottom<=q.y+10){e.y=q.y-e.h;e.vy=0;e.onGround=true}else if(e.vy<0&&oldY>=q.y+q.h-3){e.y=q.y+q.h;e.vy=0}}});e.x+=e.vx*dt;platforms.forEach(function(q){if(hit(e,q)){if(e.vx>0&&oldX+e.w<=q.x+3)e.x=q.x-e.w;else if(e.vx<0&&oldX>=q.x+q.w-3)e.x=q.x+q.w;e.vx=0}});e.x=Math.max(0,Math.min(levelW-e.w,e.x))}
function burst(x,y,n,c){SparkEffects.burst(fx,x,y,n,c)}
function shoot(x,y,vx,vy,dmg,owner,c){SparkEffects.shoot(bullets,x,y,vx,vy,dmg,owner,c)}
function segmentHitsRect(x1,y1,x2,y2,r){return SparkPhysics.segmentHitsRect(x1,y1,x2,y2,r)}
function hurt(n){if(p.inv>0||p.dead||state!=='PLAY')return;if(p.shield>0){worldShake=Math.max(worldShake,.8);p._blockPulse=1;burst(p.x+p.w/2,p.y+p.h/2,5,'#55dff3');beep(980,.04);return}p.hp=Math.max(0,p.hp-n);worldShake=Math.max(worldShake,Math.min(4.5,1.5+n*.12));p.inv=.75;p._hitReact=Math.min(1,(p._hitReact||0)+.85);beep(150,.1);burst(p.x,p.y,10,'#ff2fa0');if(p.hp===0){p.dead=true;later(function(){if(state==='PLAY'){state='DEAD';resetInput();$('controls').classList.add('hidden');$('over').classList.remove('hidden')}},400)}}
function toast(s){var t=$('toast');if(!t)return;t.textContent=s;t.classList.remove('hidden');clearToastTimer();toast.id=setTimeout(function(){t.classList.add('hidden');toast.id=0},1000)}
function update(dt){worldShake=Math.max(0,worldShake-dt*18);if(state!=='PLAY')return;updatePickups(dt);p.inv=Math.max(0,p.inv-dt);p.atk=Math.max(0,p.atk-dt);p.cd=Math.max(0,p.cd-dt);p.dashCd=Math.max(0,p.dashCd-dt);p.dash=Math.max(0,p.dash-dt);p.shieldCd=Math.max(0,p.shieldCd-dt);p.shield=Math.max(0,p.shield-dt);var dir=(keys.right?1:0)-(keys.left?1:0);if(dir){p.vx+=dir*980*dt;p.vx=Math.max(-155,Math.min(155,p.vx));p.face=dir}else p.vx*=Math.pow(.018,dt);if(p.onGround)p.coyote=.1;else p.coyote=Math.max(0,p.coyote-dt);if(keys.jumpEdge){p.jbuf=.12;keys.jumpEdge=false}else p.jbuf=Math.max(0,p.jbuf-dt);if(p.jbuf>0&&p.coyote>0){p.vy=-490;p.jbuf=0;p.coyote=0;burst(p.x+p.w*.5,p.y+p.h,5,levelTheme===3?'#53f3d6':levelTheme===1?'#9adfff':'#ffb16a');beep(500,.08)}if(keys.skillEdge){keys.skillEdge=false;if(p.dashCd<=0){var dirBlink=p.face||1,fromX=p.x,toX=Math.max(0,Math.min(levelW-p.w,p.x+156*dirBlink)),blocked=false,stepX=dirBlink*4;for(var tx=fromX+stepX;dirBlink>0?tx<toX:tx>toX;tx+=stepX){for(var oi=1;oi<platforms.length;oi++){var ob=platforms[oi];if(tx<ob.x+ob.w&&tx+p.w>ob.x&&p.y<ob.y+ob.h-1&&p.y+p.h>ob.y+1){blocked=true;break}}if(blocked)break}if(!blocked){burst(p.x+p.w/2,p.y+p.h/2,12,selectedCharacter.color);p.x=toX;p.vx=0;p.dash=.1;p.dashCd=1.0;p.inv=Math.max(p.inv,.22);burst(p.x+p.w/2,p.y+p.h/2,12,selectedCharacter.color);beep(430,.07,'sawtooth')}else{beep(150,.05);toast('ПУТЬ ЗАБЛОКИРОВАН')}}else toast('БЛИНК: '+Math.ceil(p.dashCd)+' СЕК.')}p.vy=Math.min(520,p.vy+900*dt);if(p.dash>0)p.vy*=.35;var wasGrounded=p.onGround,landingSpeed=p.vy;collide(p,dt);if(!wasGrounded&&p.onGround&&landingSpeed>95){p._landPulse=Math.min(1,landingSpeed/520);p._gaitPhase=(p._gaitPhase||0)+.35;burst(p.x+p.w*.5,p.y+p.h,Math.min(7,Math.floor(landingSpeed/85)),'#9db9ca')}if(p.onGround&&Math.abs(p.vx)>7)p._gaitPhase=(p._gaitPhase||0)+Math.abs(p.vx)*dt*.18;
if(keys.attack||keys.attackEdge){keys.attackEdge=false;var wp=WEAPONS[p.weapon]||WEAPONS.pistol;if(p.cd<=0&&p.en>=wp.cost){p.cd=wp.cd;p.atk=.16;p.en-=wp.cost;var bx=p.x+p.w/2,by=p.y+p.h*.48,target=SparkAI.nearestTarget(enemies,boss,bx,by,460);var baseAng=target?Math.atan2((target.y+target.h*.5)-by,(target.x+target.w*.5)-bx):(p.face>0?0:Math.PI);if(Math.cos(baseAng)!==0)p.face=Math.cos(baseAng)>0?1:-1;bx+=p.face*8;for(var wi=0;wi<wp.count;wi++){var tt=wp.count===1?0:(wi/(wp.count-1)-.5)*2,ang=baseAng+tt*wp.spread;shoot(bx,by,Math.cos(ang)*wp.spd,Math.sin(ang)*wp.spd,wp.dmg,'p',selectedCharacter.shot)}beep(850,.05,'sawtooth')}}
if(keys.interactEdge){keys.interactEdge=false;if(p.shieldCd<=0&&p.en>=22){p.en-=22;p.shield=2.4;p.shieldCd=6;burst(p.x+p.w/2,p.y+p.h/2,12,'#55dff3');beep(760,.12);toast('ЩИТ АКТИВИРОВАН')}else if(p.shieldCd>0)toast('ЩИТ ПЕРЕЗАРЯЖАЕТСЯ');else toast('НЕДОСТАТОЧНО ЭНЕРГИИ')}
p.en=Math.min(100,p.en+18*dt);p.anim+=dt;p._hitReact=Math.max(0,(p._hitReact||0)-dt*2.8);p._landPulse=Math.max(0,(p._landPulse||0)-dt*3.5);p._blockPulse=Math.max(0,(p._blockPulse||0)-dt*5.5);if(p.y>worldH)hurt(999);
SparkAI.updateEnemies(enemies,p,dt,levelAI,levelW,shoot,burst,hit,wSafe,hurt);
enemies=enemies.filter(function(e){return e.hp>0});
if(p.x>boss.x-210&&!boss.active){boss.active=true;$('bossMeter').style.display='block';$('bossMeter').firstChild.textContent=['АКИРО','ГОЛИАФ','РЭЙДЗИН','КАГЕ'][selectedLevel]+' · CORE';toast(['АКИРО ВСТУПАЕТ В БОЙ','ГОЛИАФ: ОСАДНЫЙ РЕЖИМ','РЭЙДЗИН: ПЕРЕХВАТ ЦЕЛИ','КАГЕ: ПРОТОКОЛ УСТРАНЕНИЯ'][selectedLevel]);beep(120,.35,'sawtooth')}
SparkAI.updateBoss(boss,p,dt,bossAI,ground,bossHomeX,levelW,shoot,burst);
bullets.forEach(function(b){b.px=b.x;b.py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.life<=0||b.x<0||b.x>levelW||b.y<0||b.y>worldH)b.dead=true;if(b.owner==='p'){for(var pi=0;pi<platforms.length;pi++){var q=platforms[pi];if(segmentHitsRect(b.px,b.py,b.x,b.y,q)){b.dead=true;break}}}if(b.dead)return;if(b.owner==='e'&&segmentHitsRect(b.px,b.py,b.x,b.y,p)){hurt(b.dmg);b.dead=true}if(b.owner==='p'){enemies.forEach(function(e){if(e.hp>0&&segmentHitsRect(b.px,b.py,b.x,b.y,e)){e.hp-=b.dmg;e.flash=.16;e.hitKick=Math.max(-7,Math.min(7,(b.vx||0)*.025));e.hitStun=Math.max(e.hitStun||0,.07);b.dead=true;burst(b.x,b.y,6,selectedCharacter.color);burst(b.x-b.vx*.012,b.y-b.vy*.012,3,'#f6fbff');if(e.hp<=0)p.scrap+=3}});if(!b.dead&&boss.active&&!boss.dead&&segmentHitsRect(b.px,b.py,b.x,b.y,boss)){var weak=b.y>boss.y+45&&b.y<boss.y+70&&b.x>boss.x+boss.w*.38&&b.x<boss.x+boss.w*.62;boss.hp=Math.max(0,boss.hp-b.dmg*(weak?2:1));boss.hitFlash=.14;boss.hitKick=Math.max(-9,Math.min(9,(b.vx||0)*.018));b.dead=true;burst(b.x,b.y,weak?8:4,weak?'#ff8a1e':'#ff2fa0');burst(b.x-b.vx*.014,b.y-b.vy*.014,5,'#f7fbff');if(boss.hp===0){boss.dead=true;burst(boss.x+boss.w/2,boss.y+boss.h*.52,50,'#ff8a1e');later(function(){if(state==='PLAY'){state='WIN';resetInput();$('controls').classList.add('hidden');$('stats').textContent='◆ SCRAP: '+p.scrap+' · HP: '+p.hp;$('win').classList.remove('hidden')}},700)}}}});
bullets=bullets.filter(function(b){return !b.dead});fx.forEach(function(f){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=240*dt;f.life-=dt});fx=fx.filter(function(f){return f.life>0});var targetCam=Math.max(0,Math.min(levelW-W,p.x+p.w/2-W/2)),targetCamY=Math.max(0,Math.min(worldH-H,p.y+p.h/2-H*.56));var camEase=1-Math.exp(-dt*8),camYEase=1-Math.exp(-dt*10);cam+=(targetCam-cam)*camEase;camY+=(targetCamY-camY)*camYEase;hud()}
function hud(){$('hp').style.width=p.hp+'%';$('en').style.width=p.en+'%';$('scrap').textContent='◆ '+p.scrap;$('weapon').textContent='▸ '+(WEAPONS[p.weapon]||WEAPONS.pistol).name;$('weapon').style.color=(WEAPONS[p.weapon]||WEAPONS.pistol).color;$('bossHp').style.width=(boss.hp/boss.maxHp*100)+'%';updateAbilityButtons()}function updateAbilityButtons(){var defs=[{sel:'[data-act="skill"]',left:p.dashCd},{sel:'[data-act="interact"]',left:Math.max(p.shieldCd,p.shield>0?p.shield:0)}];defs.forEach(function(d){var b=document.querySelector(d.sel);if(!b)return;var n=Math.max(0,d.left||0);var badge=b.querySelector('.cooldown');if(!badge){badge=document.createElement('span');badge.className='cooldown';b.appendChild(badge)}b.classList.toggle('cooling',n>0.04);badge.textContent=n>0.04?Math.ceil(n).toString():'';b.setAttribute('aria-label',(d.sel.indexOf('skill')>=0?'Блинк':'Щит')+(n>0.04?': '+Math.ceil(n)+' сек.':' — готово'))})}
// RENDERING: shared primitives, articulated actors, backgrounds and effects.
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}

function outlineRect(x,y,w,h,fill,stroke,lw){ctx.fillStyle=fill;ctx.fillRect(Math.round(x),Math.round(y),w,h);ctx.lineWidth=lw||2;ctx.strokeStyle=stroke||'#080d17';ctx.strokeRect(Math.round(x),Math.round(y),w,h)}
function rigJointAngle(phase,amp,offset){return SparkRenderMath.jointAngle(phase,amp,offset)}
// Render-only critically damped approximation: never writes to simulation x/y or collision state.
function smoothRenderPose(o,tx,ty,dt,teleportLimit){SparkRenderMath.smoothPose(o,tx,ty,dt,teleportLimit)}
// Mild depth scale around the feet: distant upper platforms are smaller, near ground sprites larger.
function depthScaleAt(y){return SparkRenderMath.depthScale(y,ground)}
function rigPivot(px,py,angle){SparkRenderMath.pivot(ctx,px,py,angle)}
function rigSolve2Bone(out,ax,ay,tx,ty,lenA,lenB,bend){return SparkRenderMath.solve2Bone(out,ax,ay,tx,ty,lenA,lenB,bend)}
// Rig primitives are owned by spark-render.js to keep drawing helpers out of runtime.
function drawRigLink(ax,ay,bx,by,outer,inner,width){SparkRenderMath.drawRigLink(ctx,ax,ay,bx,by,outer,inner,width)}
function drawRigHinge(x,y,r,outer,inner){SparkRenderMath.drawRigHinge(ctx,x,y,r,outer,inner)}
function drawOperator(x,y,face,ch,anim,attacking,velocityX,velocityY,hitReact,landPulse){
 var depth=depthScaleAt(y+37),speed=Math.min(1,Math.abs(velocityX||0)/155),air=Math.min(1,Math.abs(velocityY||0)/490);
 var gaitPhase=anim||0,impact=Math.max(0,Math.min(1,hitReact||0)),landing=Math.max(0,Math.min(1,landPulse||0)),bob=air>.12?Math.min(1.5,air*1.5):Math.abs(Math.sin(gaitPhase*2))*(.12+speed*.55)-landing*1.5,step=Math.sin(gaitPhase)*speed*2.6,edge='#080d16',accent=ch.color||'#ffad32',shot=ch.shot||accent;
 if(!drawOperator._rig)drawOperator._rig={elbowL:{x:0,y:0,tx:0,ty:0},elbowR:{x:0,y:0,tx:0,ty:0},kneeL:{x:0,y:0,tx:0,ty:0},kneeR:{x:0,y:0,tx:0,ty:0}};
 var opr=drawOperator._rig;
 ctx.save();ctx.translate(Math.round(x+12),Math.round(y+37+bob));ctx.rotate(Math.max(-.11,Math.min(.11,-(velocityX||0)*.00022+(velocityY||0)*.000035+(impact*(face||1)*-.075))));ctx.scale(face||1,1);ctx.scale(depth,depth);ctx.translate(-12,-37);
 // contact shadow and a subtle team-colour pool
 ctx.fillStyle='rgba(1,4,10,.72)';ctx.beginPath();ctx.ellipse(12,39,14,3,0,0,Math.PI*2);ctx.fill();
 ctx.globalAlpha=.17;ctx.fillStyle=accent;ctx.fillRect(2,37,7,1);ctx.fillRect(15,37,7,1);ctx.globalAlpha=1;
 // Hip -> knee -> ankle chains; each leg swings around its own attachment point.
 var legL=rigJointAngle(gaitPhase,.075,0),legR=rigJointAngle(gaitPhase,.075,Math.PI),impactCrouch=landing*1.8;
 rigSolve2Bone(opr.kneeL,7,25,7+Math.sin(gaitPhase)*1.6,31-impactCrouch,6,6,1);
 rigSolve2Bone(opr.kneeR,17,25,17-Math.sin(gaitPhase)*1.6,31-impactCrouch,6,6,-1);
 drawRigLink(7,25,opr.kneeL.x,opr.kneeL.y,'#101827',ch.pants,5);drawRigLink(opr.kneeL.x,opr.kneeL.y,opr.kneeL.tx,opr.kneeL.ty,'#101827',ch.pants,5);
 drawRigHinge(opr.kneeL.x,opr.kneeL.y,2,edge,'#8fa6ba');
 drawRigLink(17,25,opr.kneeR.x,opr.kneeR.y,'#101827',ch.pants,5);drawRigLink(opr.kneeR.x,opr.kneeR.y,opr.kneeR.tx,opr.kneeR.ty,'#101827',ch.pants,5);
 drawRigHinge(opr.kneeR.x,opr.kneeR.y,2,edge,'#8fa6ba');
 ctx.save();rigPivot(7,25,rigJointAngle(gaitPhase,.075,0)+(attacking>0?-.025:0)+landing*.06);
 outlineRect(4,25+Math.max(0,step),6,8,ch.pants,edge,2);outlineRect(3,28+Math.max(0,step),7,3,'#40516a',edge,1);
 ctx.fillStyle='#a6c1d5';ctx.fillRect(4,29+Math.max(0,step),3,1);outlineRect(1,32+Math.max(0,step),10,5,'#1b283b',edge,2);
 ctx.fillStyle='#d6e4eb';ctx.fillRect(3,33+Math.max(0,step),5,1);ctx.fillStyle=accent;ctx.fillRect(5,31,3,1);ctx.restore();
 ctx.save();rigPivot(17,25,rigJointAngle(gaitPhase,.075,Math.PI)+(attacking>0?-.025:0)+landing*.06);
 outlineRect(14,25+Math.max(0,-step),6,8,ch.pants,edge,2);outlineRect(14,28+Math.max(0,-step),7,3,'#40516a',edge,1);
 ctx.fillStyle='#a6c1d5';ctx.fillRect(15,29+Math.max(0,-step),3,1);outlineRect(12,32+Math.max(0,-step),11,5,'#1b283b',edge,2);
 ctx.fillStyle='#d6e4eb';ctx.fillRect(15,33+Math.max(0,-step),5,1);ctx.fillStyle=accent;ctx.fillRect(16,31,3,1);ctx.restore();
 // rear utility pack, scroll tube and glowing clasp
 outlineRect(1,13,6,14,'#26364b',edge,2);outlineRect(2,15,4,7,'#43566b',edge,1);ctx.fillStyle='#90a9bd';ctx.fillRect(3,16,2,1);ctx.fillRect(3,19,2,1);ctx.fillStyle=shot;ctx.fillRect(2,22,3,2);
 // layered jacket and shoulder silhouette
 outlineRect(3,13,18,14,ch.coat,edge,2);outlineRect(5,14,14,3,accent,edge,1);ctx.fillStyle='#ffffff';ctx.globalAlpha=.2;ctx.fillRect(6,14,9,1);ctx.globalAlpha=1;
 outlineRect(5,17,14,7,'#27394e',edge,1);outlineRect(7,18,9,4,ch.coat,edge,1);outlineRect(8,19,6,2,accent,edge,1);ctx.fillStyle='#eaf7f7';ctx.fillRect(9,19,3,1);
 // diagonal strap, pouch and segmented shoulder guards
 ctx.strokeStyle='#101827';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(6,16);ctx.lineTo(16,24);ctx.stroke();ctx.strokeStyle='#a9bfd0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(7,16);ctx.lineTo(16,23);ctx.stroke();
 outlineRect(3,14,5,5,ch.coat,edge,1);outlineRect(17,13,6,6,ch.coat,edge,1);ctx.fillStyle='#f0d4b0';ctx.fillRect(4,15,2,1);ctx.fillRect(19,14,2,1);
 outlineRect(5,23,13,3,'#172338',edge,1);ctx.fillStyle=shot;ctx.fillRect(8,24,6,1);
 // Shoulder -> elbow -> wrist chains. Upper-arm and forearm links share articulated endpoints.
 var armL=rigJointAngle(anim*9,.05,0)+(attacking>0?-.06:0),armR=rigJointAngle(anim*9,.055,Math.PI)+(attacking>0?-.14:0);
 ctx.save();rigPivot(5,17,armL);outlineRect(0,17,5,7,ch.coat,edge,2);ctx.restore();
 rigSolve2Bone(opr.elbowL,5,18,3+Math.sin(armL)*1.5,23,4.5,4.5,1);
 drawRigLink(5,18,opr.elbowL.x,opr.elbowL.y,'#101827',ch.coat,4);drawRigLink(opr.elbowL.x,opr.elbowL.y,opr.elbowL.tx,opr.elbowL.ty,'#101827',ch.coat,4);
 drawRigHinge(opr.elbowL.x,opr.elbowL.y,2.1,edge,'#71879a');
 ctx.save();rigPivot(20,16,armR);outlineRect(18,16,5,7,ch.coat,edge,2);ctx.restore();
 rigSolve2Bone(opr.elbowR,20,18,21+Math.sin(armR)*1.5,23,4.5,4.5,-1);
 drawRigLink(20,18,opr.elbowR.x,opr.elbowR.y,'#101827',ch.coat,4);drawRigLink(opr.elbowR.x,opr.elbowR.y,opr.elbowR.tx,opr.elbowR.ty,'#101827',ch.coat,4);
 drawRigHinge(opr.elbowR.x,opr.elbowR.y,2.1,edge,accent);
 // Weapon mount, receiver, barrel and muzzle share a recoil pivot.
 ctx.save();rigPivot(19,20,rigJointAngle(gaitPhase,.025,Math.PI)+(attacking>0?-.12:0)+impact*.065+landing*.08);
 outlineRect(16,18,11,4,'#17263a',edge,2);outlineRect(19,17,7,3,'#3d5067',edge,1);outlineRect(23,18,6,2,shot,edge,1);ctx.fillStyle='#f5e8d2';ctx.fillRect(27,18,2,1);
 ctx.fillStyle='#7e94a8';ctx.fillRect(18,22,3,2);ctx.fillStyle=shot;ctx.fillRect(20,20,4,1);ctx.fillStyle='#101827';ctx.fillRect(21,22,2,2);ctx.restore();
 if(attacking>0){ctx.save();ctx.globalAlpha=.8;ctx.shadowColor=shot;ctx.shadowBlur=8;ctx.fillStyle=shot;ctx.beginPath();ctx.moveTo(28,16);ctx.lineTo(36,19);ctx.lineTo(29,23);ctx.closePath();ctx.fill();ctx.fillStyle='#fff6d7';ctx.fillRect(28,18,5,2);ctx.restore()}
 // Neck pivot makes the head, hair and headband move as one connected assembly.
 ctx.save();rigPivot(11.5,11,rigJointAngle(gaitPhase,.018,0)+(attacking>0?-.025:0)+impact*.045);
 outlineRect(8,9,7,5,ch.skin,edge,1);outlineRect(4,2,15,13,ch.skin,edge,2);
 ctx.fillStyle='#bd776c';ctx.fillRect(5,10,3,2);ctx.fillRect(15,10,3,2);ctx.fillStyle='#ffe0bb';ctx.fillRect(6,4,2,3);ctx.fillRect(7,3,5,1);
 // hair silhouette varies naturally by character hair colour
 outlineRect(3,0,17,6,ch.hair,edge,2);outlineRect(2,3,4,8,ch.hair,edge,1);outlineRect(17,3,4,7,ch.hair,edge,1);
 ctx.fillStyle='#ffffff';ctx.globalAlpha=.2;ctx.fillRect(5,1,8,1);ctx.fillRect(4,3,3,1);ctx.globalAlpha=1;
 // headband, plate, engraved glint and side ties
 outlineRect(4,5,14,2,accent,edge,1);ctx.fillStyle='#eaf7ff';ctx.fillRect(7,5,7,1);ctx.fillStyle='#637e94';ctx.fillRect(14,6,2,1);ctx.fillStyle=accent;ctx.fillRect(18,6,3,1);
 // eyes with brows and tiny mouth pixels
 ctx.fillStyle='#101827';ctx.fillRect(7,8,3,2);ctx.fillRect(14,8,3,2);ctx.fillStyle='#fff0d6';ctx.fillRect(8,8,1,1);ctx.fillRect(15,8,1,1);ctx.fillStyle='#3c2935';ctx.fillRect(7,7,3,1);ctx.fillRect(14,7,3,1);ctx.fillStyle='#9b4e54';ctx.fillRect(11,11,3,1);ctx.fillStyle='#f3b9a0';ctx.fillRect(10,12,4,1);
 // silhouette ink and cloth rim light
 ctx.fillStyle='#ffffff';ctx.globalAlpha=.16;ctx.fillRect(4,13,13,1);ctx.fillRect(4,2,1,10);ctx.globalAlpha=1;ctx.lineWidth=1.5;ctx.strokeStyle=edge;ctx.strokeRect(3,0,17,15);
 ctx.restore();
 ctx.restore();
}
function drawEnemy(e){
 var x=(e._rx===undefined?e.x:e._rx)+(e.hitKick||0),y=e._ry===undefined?e.y:e._ry,w=e.w,h=e.h,t=e.type,now=performance.now()*.001,depth=depthScaleAt(y+h);
 var glow=t==='sniper'?'#c68aff':t==='support'?'#65ffd1':t==='drone'?'#50eaff':t==='turret'?'#ffb454':t==='shield'?'#ff6b91':'#ff596d';
 var shell=t==='drone'?'#182e43':t==='sniper'?'#292440':t==='support'?'#183d38':t==='shield'?'#492532':t==='turret'?'#302a3b':'#352331';
 function rr(a,b,c,d,r,col){ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(a,b,c,d,Math.min(r,c/2,d/2));ctx.fill()}
 function circ(a,b,r,col){ctx.fillStyle=col;ctx.beginPath();ctx.arc(a,b,Math.max(.1,r),0,Math.PI*2);ctx.fill()}
 function line(a,b,c,d,col,lw){ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke()}
 ctx.save();ctx.translate(x+w*.5,y+h);ctx.scale(depth,depth);ctx.translate(-(x+w*.5),-(y+h));var movePhase=e._gaitPhase===undefined?(e.anim||0)*11:e._gaitPhase,enemySpeed=Math.abs(e._rvx||e.vxRun||e.v||0),stepSwing=Math.sin(movePhase)*Math.min(2.6,enemySpeed*.025),hoverBob=t==='drone'?Math.sin((e.t||0)*2.8)*1.8:0;ctx.translate(x+w/2,y+h/2+hoverBob);var lean=Math.max(-.09,Math.min(.09,-(e._rvx||e.vxRun||0)*.00035+(e._rax||0)*-.000012));if(t==='drone')lean=Math.max(-.12,Math.min(.12,(e._rvx||0)*.00045));if(t==='turret')lean=Math.max(-.045,Math.min(.045,-(e._rvx||0)*.00025));ctx.rotate(lean+Math.max(-.045,Math.min(.045,-(e.hitKick||0)*.006)));var hitPose=Math.max(0,Math.min(1,(e.flash||0)/.16));ctx.scale(1+hitPose*.035,1-hitPose*.055);if(t!=='drone'&&t!=='turret'&&e.face)ctx.scale(e.face,1);
 // Reusable enemy rig landmarks in local coordinates; visual-only and independent of hitboxes.
 if(!e.rigNodes)e.rigNodes={hipL:{x:0,y:0},kneeL:{x:0,y:0},ankleL:{x:0,y:0},hipR:{x:0,y:0},kneeR:{x:0,y:0},ankleR:{x:0,y:0},shoulderL:{x:0,y:0},elbowL:{x:0,y:0},wristL:{x:0,y:0},shoulderR:{x:0,y:0},elbowR:{x:0,y:0},wristR:{x:0,y:0},weaponMount:{x:0,y:0},muzzle:{x:0,y:0}};
 var en=e.rigNodes;en.hipL.x=-w*.18;en.hipL.y=h*.1;en.kneeL.x=-w*.19;en.kneeL.y=h*.27;en.ankleL.x=-w*.1;en.ankleL.y=h*.4;en.hipR.x=w*.18;en.hipR.y=h*.1;en.kneeR.x=w*.19;en.kneeR.y=h*.27;en.ankleR.x=w*.1;en.ankleR.y=h*.4;en.shoulderL.x=-w*.34;en.shoulderL.y=-h*.08;en.elbowL.x=-w*.4;en.elbowL.y=h*.08;en.wristL.x=-w*.39;en.wristL.y=h*.17;en.shoulderR.x=w*.34;en.shoulderR.y=-h*.08;en.elbowR.x=w*.4;en.elbowR.y=h*.08;en.wristR.x=w*.43;en.wristR.y=h*.02;en.weaponMount.x=w*.4;en.weaponMount.y=-h*.02;en.muzzle.x=w*.67;en.muzzle.y=-h*.065;
 // Atmospheric bloom is confined to the sprite; no hard outer frame.
 ctx.save();ctx.globalAlpha=.13+.045*Math.sin(now*3.2+e.x*.035);ctx.shadowColor=glow;ctx.shadowBlur=13;circ(0,0,Math.max(w,h)*.44,glow);ctx.restore();
 ctx.globalAlpha=.45;ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(0,h*.43,w*.34,2+Math.sin(now*7)*.4,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 ctx.save();ctx.shadowColor=glow;ctx.shadowBlur=5;
 if(t==='drone'){
  // Floating scout drone: offset engine pods, layered shell, glass lens and exhaust.
  // Twin engine pods swivel independently from their shoulder-like mounting struts.
  ctx.save();rigPivot(-w*.23,-h*.12,Math.sin((e.t||0)*2.8)*.045);line(-w*.23,-h*.12,-w*.43,-h*.31,'#50677f',2);rr(-w*.49,-h*.34,w*.2,h*.19,3,'#334c65');ctx.restore();
  ctx.save();rigPivot(w*.23,-h*.12,-Math.sin((e.t||0)*2.8)*.045);line(w*.23,-h*.12,w*.43,-h*.31,'#50677f',2);rr(w*.29,-h*.34,w*.2,h*.19,3,'#334c65');ctx.restore();
  rr(-w*.38,-h*.26,w*.76,h*.59,h*.26,shell);rr(-w*.28,-h*.22,w*.56,h*.21,h*.1,'#46677e');
  rr(-w*.23,-h*.01,w*.46,h*.25,h*.1,'#0b1726');rr(-w*.18,h*.02,w*.36,h*.15,h*.07,'#213e56');
  circ(-w*.09,h*.085,w*.065,'#b9fbff');circ(-w*.09,h*.085,w*.038,glow);circ(w*.09,h*.085,w*.065,'#b9fbff');circ(w*.09,h*.085,w*.038,glow);
  rr(-w*.3,h*.25,w*.2,2,1,glow);rr(w*.1,h*.25,w*.2,2,1,glow);
  circ(-w*.39,-h*.16,1.5,'#e5ffff');circ(w*.39,-h*.16,1.5,'#e5ffff');
 }else if(t==='turret'){
  rr(-w*.38,h*.17,w*.76,h*.24,h*.1,'#1d2839');rr(-w*.29,h*.23,w*.58,h*.12,3,'#465166');
  for(var tr=0;tr<5;tr++){var treadX=-w*.3+((tr*5+(e.wheel||0)*9)%(w*.6));circ(treadX,h*.29,1.35,tr%2?glow:'#ffce83')}
  rr(-w*.32,-h*.24,w*.64,h*.48,h*.15,shell);rr(-w*.23,-h*.43,w*.46,h*.34,h*.13,'#3d4d62');
  rr(-w*.14,-h*.35,w*.28,h*.16,3,'#101a29');rr(-w*.07,-h*.32,w*.14,h*.09,2,glow);
  // Turret barrel pivots at the yoke and recoils briefly on firing.
  ctx.save();rigPivot(w*.2,-h*.2,Math.sin((e.t||0)*1.4)*.018+((e.fireT||e.attackT||0)>0?-.035:0));
  rr(w*.12,-h*.29,w*.47,Math.max(4,h*.12),3,'#5a6d83');rr(w*.51,-h*.28,w*.13,Math.max(3,h*.1),2,glow);ctx.restore();
  circ(-w*.17,-h*.31,1,'#fff3d8');circ(w*.02,-h*.31,1,'#fff3d8');
 }else{
  // Humanoid units use curved overlapping armor plates and exposed joints.
  // Hip and knee hinges: upper/lower armor move as connected leg segments.
  ctx.save();rigPivot(en.hipL.x,en.hipL.y,stepSwing*.018);rr(-w*.29,h*.1,w*.23,h*.3,4,'#182738');rr(-w*.31,h*.25+stepSwing*.45,w*.26,h*.14,3,'#43536a');line(-w*.18,h*.32+stepSwing*.3,-w*.1,h*.4+stepSwing*.3,'#9cb3c7',1);ctx.restore();
  ctx.save();rigPivot(en.hipR.x,en.hipR.y,-stepSwing*.018);rr(w*.06,h*.1,w*.23,h*.3,4,'#182738');rr(w*.05,h*.25-stepSwing*.45,w*.26,h*.14,3,'#43536a');line(w*.18,h*.32-stepSwing*.3,w*.1,h*.4-stepSwing*.3,'#9cb3c7',1);ctx.restore();
  rr(-w*.4,-h*.19,w*.8,h*.5,Math.min(8,w*.19),shell);
  rr(-w*.3,-h*.15,w*.6,h*.25,Math.min(6,w*.14),'#394e64');
  // Chest reactor and fine edge highlights
  rr(-w*.18,-h*.08,w*.36,h*.12,3,'#101b2a');rr(-w*.12,-h*.06,w*.24,h*.075,3,glow);
  line(-w*.27,-h*.11,-w*.2,h*.03,'#8ca4b9',1);line(w*.27,-h*.11,w*.2,h*.03,'#8ca4b9',1);
  ctx.save();rigPivot(en.shoulderL.x,en.shoulderL.y,Math.sin(movePhase)*.035);rr(-w*.48,-h*.13,w*.22,h*.28,5,'#3b5066');rr(-w*.42,-h*.08,w*.1,h*.11,3,'#6e849a');ctx.restore();
  ctx.save();rigPivot(en.shoulderR.x,en.shoulderR.y,-Math.sin(movePhase)*.035+((e.fireT||e.attackT||0)>0?-.09:0));rr(w*.26,-h*.13,w*.22,h*.28,5,'#3b5066');rr(w*.32,-h*.08,w*.1,h*.11,3,'#6e849a');ctx.restore();
  // Reusable IK endpoints drive visible upper/lower arm and leg links.
  rigSolve2Bone(en.elbowL,en.shoulderL.x,en.shoulderL.y,en.wristL.x,en.wristL.y,w*.16,w*.15,1);
  rigSolve2Bone(en.elbowR,en.shoulderR.x,en.shoulderR.y,en.wristR.x,en.wristR.y,w*.16,w*.15,-1);
  drawRigLink(en.shoulderL.x,en.shoulderL.y,en.elbowL.x,en.elbowL.y,'#101a28','#7c91a6',Math.max(2,w*.075));
  drawRigLink(en.elbowL.x,en.elbowL.y,en.wristL.x,en.wristL.y,'#101a28','#a7bacb',Math.max(1.5,w*.055));
  drawRigHinge(en.elbowL.x,en.elbowL.y,Math.max(1.4,w*.045),'#101a28',glow);
  drawRigLink(en.shoulderR.x,en.shoulderR.y,en.elbowR.x,en.elbowR.y,'#101a28','#7c91a6',Math.max(2,w*.075));
  drawRigLink(en.elbowR.x,en.elbowR.y,en.wristR.x,en.wristR.y,'#101a28','#a7bacb',Math.max(1.5,w*.055));
  drawRigHinge(en.elbowR.x,en.elbowR.y,Math.max(1.4,w*.045),'#101a28',glow);
  rigSolve2Bone(en.kneeL,en.hipL.x,en.hipL.y,en.ankleL.x,en.ankleL.y,w*.14,w*.13,1);
  rigSolve2Bone(en.kneeR,en.hipR.x,en.hipR.y,en.ankleR.x,en.ankleR.y,w*.14,w*.13,-1);
  drawRigLink(en.hipL.x,en.hipL.y,en.kneeL.x,en.kneeL.y,'#101a28','#43536a',Math.max(2,w*.08));
  drawRigLink(en.kneeL.x,en.kneeL.y,en.ankleL.x,en.ankleL.y,'#101a28','#9cb3c7',Math.max(1.5,w*.05));
  drawRigHinge(en.kneeL.x,en.kneeL.y,Math.max(1.4,w*.04),'#101a28',glow);
  drawRigLink(en.hipR.x,en.hipR.y,en.kneeR.x,en.kneeR.y,'#101a28','#43536a',Math.max(2,w*.08));
  drawRigLink(en.kneeR.x,en.kneeR.y,en.ankleR.x,en.ankleR.y,'#101a28','#9cb3c7',Math.max(1.5,w*.05));
  drawRigHinge(en.kneeR.x,en.kneeR.y,Math.max(1.4,w*.04),'#101a28',glow);
  // Neck pivot carries helmet, faceplate and antenna as a connected assembly.
  ctx.save();rigPivot(0,-h*.28,Math.sin(movePhase*.45)*.018+((e.hitKick||0)!==0?.025:0));
  rr(-w*.29,-h*.48,w*.58,h*.35,Math.min(8,w*.19),t==='shield'?'#71859c':shell);
  rr(-w*.23,-h*.4,w*.46,h*.11,4,'#43576d');rr(-w*.2,-h*.28,w*.4,h*.1,4,'#101a28');
  rr(-w*.16,-h*.27,w*.12,Math.max(2,h*.045),2,glow);rr(w*.04,-h*.27,w*.12,Math.max(2,h*.045),2,glow);
  circ(-w*.1,-h*.27,1,'#f3ffff');circ(w*.1,-h*.27,1,'#f3ffff');
  line(0,-h*.47,0,-h*.55,'#728aa1',1.4);circ(0,-h*.56,Math.max(1.3,w*.035),glow);ctx.restore();
  // Vents and type-specific attachments remain on the torso/weapon rig.
  for(var v=0;v<3;v++)line(-w*.1+v*w*.1,h*.08,-w*.1+v*w*.1,h*.12,'#8da2b6',.8);
  if(t==='shield'){
   rr(w*.28,-h*.42,w*.22,h*.72,5,'#526b84');rr(w*.33,-h*.35,w*.12,h*.58,4,'#9db3c7');
   line(w*.39,-h*.26,w*.39,h*.16,glow,2);circ(w*.39,-h*.29,2,'#fff1f6');
  }
  if(t==='sniper'){
   ctx.save();rigPivot(en.weaponMount.x,en.weaponMount.y,(e.fireT||e.attackT||0)>0?-.07:Math.sin(movePhase)*.012);
   rr(w*.16,-h*.04,w*.5,3,2,'#45405f');rr(w*.46,-h*.075,w*.22,2,1,glow);circ(w*.67,-h*.065,1.3,'#f6dfff');ctx.restore();
   line(w*.06,-h*.44,w*.22,-h*.51,'#7d6aa8',1.2);
  }
  if(t==='support'){
   circ(0,-h*.51,Math.max(2,w*.075),glow);circ(0,-h*.51,1.2,'#effff9');
   line(0,-h*.02,0,h*.08,'#a8ffe0',1.2);line(-w*.08,h*.03,w*.08,h*.03,'#a8ffe0',1.2);
  }
  if(t==='runner'){
   line(-w*.2,h*.24,-w*.33,h*.31,glow,1.5);line(w*.13,h*.24,w*.28,h*.31,glow,1.5);
  }
 }
 // Brief material response: the armor compresses on impact and catches a sharp specular flash.
 if((e.flash||0)>0){ctx.save();ctx.globalAlpha=Math.min(.62,(e.flash||0)*3.8);ctx.fillStyle='#eafcff';ctx.fillRect(-w*.24,-h*.36,w*.48,h*.48);ctx.globalAlpha*=.55;ctx.fillStyle=glow;ctx.fillRect(-w*.3,-h*.04,w*.6,Math.max(2,h*.07));ctx.restore()}
 ctx.restore();
 // Specular marks, no bounding-box stroke.
 ctx.globalAlpha=.78;circ(-w*.2,-h*.39,1,'#e9fbff');circ(w*.18,-h*.39,1,'#e9fbff');ctx.globalAlpha=1;
 ctx.restore();
 if(e.hp<e.maxHp){
  var bw=Math.max(16,w*.82),bh=2,bx=x+(w-bw)/2,by=y-6;
  ctx.save();rr(bx,by,bw,bh,1,'#111b2a');rr(bx,by,Math.max(0,bw*e.hp/e.maxHp),bh,1,glow);ctx.restore();
 }
}
function drawBoss(){
 var bx=boss._rx===undefined?boss.x:boss._rx,by=boss._ry===undefined?boss.y:boss._ry, x=Math.round(bx+(boss.hitKick||0)),y=Math.round(by),w=boss.w,h=boss.h,edge='#080b13',phase=boss.phase||1,depth=depthScaleAt(y+h);
 var profiles=[
  {name:'АКИРО',kind:'samurai',base:'#252b38',armor:'#842b3c',light:'#ff4357',metal:'#c5c8cf'},
  {name:'ГОЛИАФ',kind:'siege',base:'#242d37',armor:'#59636b',light:'#ffad35',metal:'#c1c8c9'},
  {name:'РЭЙДЗИН',kind:'drone',base:'#101c2d',armor:'#1b5278',light:'#55eaff',metal:'#a7f6ff'},
  {name:'КАГЕ',kind:'ninja',base:'#171a29',armor:'#e0dce6',light:'#ff315c',metal:'#85869a'}
 ],b=profiles[selectedLevel]||profiles[0],glow=b.light;
 var pulse=.5+.5*Math.sin((boss.pattern||0)*5),flash=boss.attack>0;
 function poly(points,fill,stroke,lw){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(var q=1;q<points.length;q++)ctx.lineTo(points[q][0],points[q][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||2;ctx.stroke()}}
 function line(points,color,lw){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(var q=1;q<points.length;q++)ctx.lineTo(points[q][0],points[q][1]);ctx.strokeStyle=color;ctx.lineWidth=lw||2;ctx.lineJoin='miter';ctx.stroke()}
 function plate(px,py,pw,ph,fill){outlineRect(px,py,pw,ph,fill,edge,3);ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(px+3,py+3,Math.max(2,pw-6),2);ctx.fillStyle='rgba(0,0,0,.24)';ctx.fillRect(px+3,py+ph-4,Math.max(2,pw-6),2)}
 ctx.save();
 // Rig landmarks are recomputed from the bind pose each frame; never accumulate transforms.
 var rigT=boss.pattern||0,rigRun=Math.min(1,Math.abs(boss._rvx||boss.visualVx||0)/180),rigHit=Math.min(1,(boss.hitFlash||0)*3);
 if(!boss.rigNodes)boss.rigNodes={root:{},pelvis:{},neck:{},head:{},shoulderL:{},elbowL:{},wristL:{},shoulderR:{},elbowR:{},wristR:{},weaponMount:{},muzzle:{},armorL:{},armorR:{}};
 var rn=boss.rigNodes;
 rn.root.x=x+w*.5;rn.root.y=y+h*.86;rn.pelvis.x=x+w*.5;rn.pelvis.y=y+h*.69;rn.neck.x=x+w*.5;rn.neck.y=y+h*.22;rn.head.x=x+w*.5;rn.head.y=y+h*.12;
 rn.shoulderL.x=x+w*.19;rn.shoulderL.y=y+h*.36;rn.elbowL.x=x+w*.12;rn.elbowL.y=y+h*.57;rn.wristL.x=x+w*.1;rn.wristL.y=y+h*.68;
 rn.shoulderR.x=x+w*.81;rn.shoulderR.y=y+h*.36;rn.elbowR.x=x+w*.88;rn.elbowR.y=y+h*.57;rn.wristR.x=x+w*.9;rn.wristR.y=y+h*.68;
 rn.weaponMount.x=x+w*.84;rn.weaponMount.y=y+h*.54;rn.muzzle.x=x+w*1.04;rn.muzzle.y=y+h*.31;rn.armorL.x=x+w*.15;rn.armorL.y=y+h*.43;rn.armorR.x=x+w*.85;rn.armorR.y=y+h*.43;
 if(!boss.rigPose)boss.rigPose={leftArm:0,rightArm:0,head:0,weaponRecoil:0,armorLag:0};
 var rp=boss.rigPose;var impactKick=Math.max(-1,Math.min(1,(boss.hitKick||0)/9))*rigHit;rp.leftArm=rigJointAngle(rigT*7,.055+rigRun*.09,0)+rigHit*.06+impactKick*.12;rp.rightArm=rigJointAngle(rigT*7,.055+rigRun*.09,Math.PI)+(boss.attack>0?-.12:0)-impactKick*.16;rp.head=rigJointAngle(rigT*2,.018,0)+rigHit*.025-impactKick*.045;var weaponKick=b.kind==='siege'?.19:b.kind==='samurai'?.15:b.kind==='drone'?.055:.10;rp.weaponRecoil=(boss.attack>0?weaponKick:0)+rigHit*(b.kind==='siege'?.11:.075);rp.armorLag=Math.max(-.08,Math.min(.08,(boss.visualVx||0)/1200))+impactKick*.035;
 // Visual-only rigid-body response: velocity stretches the silhouette; impacts and heavy attacks compress it.
 var vx=boss.visualVx||0,vy=boss.visualVy||0,speed=Math.min(1,Math.abs(vx)/360),lift=Math.min(1,Math.abs(vy)/260);
 var sx=1+speed*.075,sy=1-speed*.055;
 // Bounded inertial squash/stretch responds to smoothed acceleration without changing hitboxes.
 var accelX=Math.max(-1,Math.min(1,(boss._rax||0)/1800)),accelY=Math.max(-1,Math.min(1,(boss._ray||0)/2200));
 sx*=1+accelX*.018;sy*=1-accelX*.012-accelY*.012;
 if(bossAI==='aerial'){sx=1+speed*.035;sy=1+lift*.09}
 if(bossAI==='siege'){sx=1+Math.min(.035,Math.abs(vx)/1200);sy=1-(boss.attack>0?.055:0)+Math.min(.025,Math.abs(vy)/900)}
 if(bossAI==='phase'&&boss.dashT>0){sx=1.12;sy=.88}
 if(bossAI==='mecha'&&boss.attack>0){sx=1.035;sy=.94}
 if((boss.hitFlash||0)>0){sx*=1.035;sy*=.965}
 ctx.translate(x+w*.5,y+h);ctx.scale(sx*depth,sy*depth);ctx.translate(-(x+w*.5),- (y+h));
 ctx.fillStyle='rgba(0,0,0,.34)';ctx.beginPath();ctx.ellipse(x+w*.5,y+h-1,w*.64,9,0,0,Math.PI*2);ctx.fill();if((boss.hitFlash||0)>0){var hitGlow=Math.min(.65,boss.hitFlash*4.5);ctx.globalAlpha=hitGlow;ctx.fillStyle='#f7fbff';ctx.fillRect(x+12,y+12,w-24,h-18);ctx.globalAlpha=hitGlow*.8;ctx.fillStyle=glow;ctx.fillRect(x+w*.28,y+h*.46,w*.44,Math.max(3,h*.035));ctx.globalAlpha=1;ctx.save();ctx.strokeStyle=glow;ctx.globalAlpha=Math.min(.8,boss.hitFlash*5);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w*.5-7,y+h*.48);ctx.lineTo(x+w*.5+7,y+h*.48);ctx.moveTo(x+w*.5,y+h*.48-7);ctx.lineTo(x+w*.5,y+h*.48+7);ctx.stroke();ctx.restore()}
 if(b.kind==='samurai'){
  // AKIRO: broad horned kabuto, split shoulder silhouette, layered lamellar cuirass and long katana.
  ctx.save();rigPivot(x+29,y+39,(boss.rigPose?boss.rigPose.armorLag:0)-.015);
  poly([[x+31,y+27],[x+10,y+15],[x+22,y+39],[x+39,y+45]],'#5c2538',edge,3);plate(x+15,y+35,35,38,'#4c2536');ctx.restore();
  ctx.save();rigPivot(x+w-29,y+39,-((boss.rigPose?boss.rigPose.armorLag:0)-.015));
  poly([[x+w-31,y+27],[x+w-10,y+15],[x+w-22,y+39],[x+w-39,y+45]],'#5c2538',edge,3);plate(x+w-50,y+35,35,38,'#4c2536');ctx.restore();
  plate(x+20,y+65,30,h*.22,'#202938');plate(x+w-50,y+65,30,h*.22,'#202938');
  plate(x+8,y+h-20,47,18,'#171e2a');plate(x+w-55,y+h-20,47,18,'#171e2a');
  // Kabuto and faceplate pivot at the neck joint; chest armor remains on the torso.
  ctx.save();rigPivot(x+w*.5,y+30,boss.rigPose?boss.rigPose.head:0);
  poly([[x+34,y+17],[x+40,y+4],[x+w*.5,y-11],[x+w-40,y+4],[x+w-34,y+17],[x+w-46,y+31],[x+46,y+31]],'#141a27',edge,4);
  poly([[x+44,y+18],[x+w*.5,y+8],[x+w-44,y+18],[x+w-49,y+26],[x+49,y+26]],'#612638','#a84a55',2);
  ctx.fillStyle=glow;ctx.fillRect(x+51,y+20,13,4);ctx.fillRect(x+w-64,y+20,13,4);ctx.restore();
  plate(x+28,y+34,w-56,h*.48,'#2a3140');
  poly([[x+35,y+43],[x+w*.5,y+51],[x+w-35,y+43],[x+w-40,y+64],[x+w*.5,y+73],[x+40,y+64]],b.armor,edge,3);
  for(var la=0;la<4;la++){ctx.fillStyle=la%2?'#a23a4a':'#632638';ctx.fillRect(x+42,y+49+la*6,w-84,4);ctx.fillStyle='#f2bd72';ctx.fillRect(x+48,y+50+la*6,3,2);ctx.fillRect(x+w-51,y+50+la*6,3,2)}
  poly([[x+w*.5,y+51],[x+w*.5+7,y+59],[x+w*.5,y+68],[x+w*.5-7,y+59]],'#ffbf6a','#ffe5a8',1);
  // arms and hands visibly connect the sword to the body
  plate(x+2,y+48,24,30,'#333b4b');plate(x+w-26,y+48,24,30,'#333b4b');plate(x+4,y+71,18,11,'#8b3444');plate(x+w-22,y+71,18,11,'#8b3444');
  // Katana is attached to the wrist joint; attack recoil rotates the whole blade assembly.
  ctx.save();rigPivot(x+w-14,y+75,(boss.rigPose&&boss.rigPose.rightArm||0)+(boss.attack>0?-.16:0));
  line([[x+w-14,y+75],[x+w+38,y+28]],'#10151f',8);line([[x+w-14,y+73],[x+w+38,y+26]],'#cfd4dc',4);line([[x+w-14,y+73],[x+w+38,y+26]],glow,1);
  line([[x+w-21,y+68],[x+w-7,y+82]],'#e5b16d',4);line([[x+w-22,y+67],[x+w-7,y+82]],edge,1);ctx.restore();
  ctx.fillStyle='#ffb15e';ctx.fillRect(x+22,y+84,6,3);ctx.fillRect(x+w-28,y+84,6,3);
 }else if(b.kind==='siege'){
  // GOLIATH: low tracked chassis, layered shoulder blocks, paired cannon towers and exposed hydraulics.
  plate(x+4,y+h*.68,w-8,h*.25,'#151c26');plate(x+12,y+h*.72,w-24,14,'#59636b');
  for(var tr=0;tr<8;tr++){ctx.fillStyle=tr%2?'#737c82':'#262f3a';ctx.fillRect(x+15+tr*14,y+h*.77,10,7);ctx.fillStyle='#111923';ctx.fillRect(x+18+tr*14,y+h*.79,4,2)}
  plate(x+15,y+31,w-30,h*.46,'#39434d');plate(x+24,y+38,w-48,25,'#242e3a');
  // broad angular shoulder armor
  ctx.save();rigPivot(x+24,y+42,(boss.rigPose?boss.rigPose.armorLag:0)-.025);poly([[x+22,y+27],[x+5,y+18],[x+2,y+53],[x+20,y+66],[x+45,y+59],[x+45,y+34]],'#4c5962',edge,4);ctx.restore();
  ctx.save();rigPivot(x+w-24,y+42,-((boss.rigPose?boss.rigPose.armorLag:0)-.025));poly([[x+w-22,y+27],[x+w-5,y+18],[x+w-2,y+53],[x+w-20,y+66],[x+w-45,y+59],[x+w-45,y+34]],'#4c5962',edge,4);ctx.restore();
  for(var side=0;side<2;side++){
   var gx=side?x+w-31:x+31;
   // Cannon mount rotates by a few degrees under recoil; barrel, socket and armor stay linked.
   ctx.save();rigPivot(gx,y+12,(boss.attack>0?-.1:0)+(boss.rigPose?boss.rigPose.armorLag*(side?1:-1):0));
   plate(gx-10,y+1,20,35,'#27313d');plate(gx-6,y-5,12,16,'#7c878e');
   ctx.fillStyle='#080e17';ctx.fillRect(gx-4,y-2,8,9);ctx.fillStyle=glow;ctx.fillRect(gx-2,y+1,4,2);
   ctx.fillStyle='#d2d6d7';ctx.fillRect(gx-9,y+34,18,3);ctx.restore();
  }
  plate(x+35,y+42,w-70,28,'#d95a27');plate(x+43,y+47,w-86,17,'#ff9c2e');
  // central reactor is a recessed lens, not a flat dot
  ctx.fillStyle='#121923';ctx.beginPath();ctx.arc(x+w*.5,y+57,19,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffb84e';ctx.lineWidth=4;ctx.stroke();
  ctx.fillStyle='#f7d28b';ctx.beginPath();ctx.arc(x+w*.5,y+57,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff6d6';ctx.beginPath();ctx.arc(x+w*.5,y+57,4,0,Math.PI*2);ctx.fill();
  line([[x+29,y+58],[x+43,y+75],[x+55,y+69]],'#c2c8c9',3);line([[x+w-29,y+58],[x+w-43,y+75],[x+w-55,y+69]],'#c2c8c9',3);
  for(var vent=0;vent<5;vent++){ctx.fillStyle=vent%2?glow:'#1b242d';ctx.fillRect(x+45+vent*10,y+81,6,3)}
 }else if(b.kind==='drone'){
  // RAIJIN: unmistakable floating diamond craft, blade wings, thruster fins and concentric cyan reactor.
  poly([[x+w*.5,y-13],[x+w*.75,y+14],[x+w+14,y+39],[x+w*.78,y+57],[x+w*.5,y+h+8],[x+w*.22,y+57],[x-14,y+39],[x+w*.25,y+14]],'#0c1829',edge,5);
  poly([[x+w*.5,y-4],[x+w*.69,y+20],[x+w*.5,y+43],[x+w*.31,y+20]],'#1c3c57','#3286aa',2);
  // Each wing has a root hinge; fin plates and their edge lights rotate as one assembly.
  ctx.save();rigPivot(x+22,y+37,rigJointAngle(rigT*3.2,.035,0)+(boss.attack>0?-.06:0));poly([[x+22,y+28],[x-18,y+34],[x+10,y+45],[x+34,y+42]],'#164e73',edge,3);
  for(var wingL=0;wingL<3;wingL++){ctx.fillStyle=wingL===1?'#55d8ef':'#2583ad';ctx.fillRect(x-18-wingL*3,y+27+wingL*9,24,5);ctx.fillStyle='#baf8ff';ctx.fillRect(x-12-wingL*3,y+28+wingL*9,7,2)}ctx.restore();
  ctx.save();rigPivot(x+w-22,y+37,-rigJointAngle(rigT*3.2,.035,0)-(boss.attack>0?-.06:0));poly([[x+w-22,y+28],[x+w+18,y+34],[x+w-10,y+45],[x+w-34,y+42]],'#164e73',edge,3);
  for(var wingR=0;wingR<3;wingR++){ctx.fillStyle=wingR===1?'#55d8ef':'#2583ad';ctx.fillRect(x+w-6+wingR*3,y+27+wingR*9,24,5);ctx.fillStyle='#baf8ff';ctx.fillRect(x+w-1+wingR*3,y+28+wingR*9,7,2)}ctx.restore();
  // core housing and rings are layered, with spokes and moving scan marks
  ctx.fillStyle='#07121f';ctx.beginPath();ctx.arc(x+w*.5,y+h*.48,29,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#287f9f';ctx.lineWidth=6;ctx.stroke();
  ctx.save();ctx.shadowColor=glow;ctx.shadowBlur=14;ctx.strokeStyle=glow;ctx.lineWidth=4;ctx.beginPath();ctx.arc(x+w*.5,y+h*.48,20+pulse*2,0,Math.PI*2);ctx.stroke();ctx.restore();
  for(var sp=0;sp<8;sp++){var sa=(boss.pattern||0)*.45+sp*Math.PI/4;line([[x+w*.5+Math.cos(sa)*10,y+h*.48+Math.sin(sa)*10],[x+w*.5+Math.cos(sa)*18,y+h*.48+Math.sin(sa)*18]],'#8af4ff',2)}
  ctx.fillStyle='#e8ffff';ctx.beginPath();ctx.arc(x+w*.5,y+h*.48,8,0,Math.PI*2);ctx.fill();ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x+w*.5,y+h*.48,4,0,Math.PI*2);ctx.fill();
  for(var thr=0;thr<3;thr++){var tx=x+w*.5+(thr-1)*22,thrusterAngle=Math.max(-.08,Math.min(.08,-(boss.visualVy||0)/1800))*(thr===1?1:.65);ctx.save();rigPivot(tx,y+h-2,thrusterAngle);ctx.shadowColor=glow;ctx.shadowBlur=8;ctx.fillStyle=glow;ctx.fillRect(tx-3,y+h-2,6,10+pulse*5);ctx.restore()}
 }else{
  // KAGE: compact humanoid assassin, pale swept crest, angular mask, scarf tails and twin red blades.
  plate(x+17,y+h*.57,24,h*.29,'#272638');plate(x+w-41,y+h*.57,24,h*.29,'#272638');
  plate(x+6,y+h-14,39,13,'#111722');plate(x+w-45,y+h-14,39,13,'#111722');
  // Kage helmet, crest and mask rotate together around the neck pivot.
  ctx.save();rigPivot(x+w*.5,y+34,boss.rigPose?boss.rigPose.head:0);
  poly([[x+27,y+24],[x+41,y+9],[x+w-41,y+9],[x+w-27,y+24],[x+w-34,y+46],[x+34,y+46]],'#252638',edge,4);
  // hair silhouette with several distinct spikes
  poly([[x+39,y+16],[x+26,y-5],[x+49,y+6],[x+62,y-12],[x+72,y+7],[x+w*.5+4,y-5],[x+w*.5+15,y+8],[x+w-35,y-7],[x+w-42,y+17],[x+w-50,y+21]],'#e2dce7',edge,3);
  poly([[x+43,y+20],[x+w*.5,y+25],[x+w-43,y+20],[x+w-48,y+35],[x+w*.5,y+42],[x+48,y+35]],'#101522','#77798b',2);
  ctx.fillStyle=glow;ctx.fillRect(x+51,y+26,12,3);ctx.fillRect(x+w-63,y+26,12,3);
  poly([[x+46,y+37],[x+w*.5,y+43],[x+w-46,y+37],[x+w-51,y+48],[x+w*.5,y+53],[x+51,y+48]],'#d0cbd6',edge,2);ctx.restore();
  plate(x+10,y+45,22,29,'#24283a');plate(x+w-32,y+45,22,29,'#24283a');
  // Blade mounts pivot at the shoulders; both blades share a controlled attack arc.
  ctx.save();rigPivot(x+17,y+51,rigJointAngle(rigT*5,.025,0)+(boss.attack>0?-.14:0));poly([[x+17,y+51],[x-10,y+21],[x+3,y+56]],glow,edge,2);ctx.restore();
  ctx.save();rigPivot(x+w-17,y+51,-rigJointAngle(rigT*5,.025,0)-(boss.attack>0?-.14:0));poly([[x+w-17,y+51],[x+w+10,y+21],[x+w-3,y+56]],glow,edge,2);ctx.restore();
  // Cloth tails lag behind lateral movement and settle during idle.
  var scarfLag=Math.max(-3,Math.min(3,(boss.visualVx||0)*.012)),scarfLift=Math.max(-2,Math.min(2,-(boss.visualVy||0)*.008));
  poly([[x+31,y+43],[x+6-scarfLag,y+55+scarfLift],[x+22-scarfLag*.5,y+57+scarfLift],[x+42,y+49]],'#7d2447',edge,2);poly([[x+w-31,y+43],[x+w-6-scarfLag,y+55+scarfLift],[x+w-22-scarfLag*.5,y+57+scarfLift],[x+w-42,y+49]],'#7d2447',edge,2);
  plate(x+33,y+56,w-66,h*.19,'#171b2a');ctx.fillStyle='#ff315c';ctx.fillRect(x+40,y+61,8,2);ctx.fillRect(x+w-48,y+61,8,2);
 }
 // REFERENCE MATCH PASS 2 — crisp pixel-scale construction marks, clipped to the boss body.
 // These marks add panel depth and engineered structure without changing the approved silhouette.
 ctx.save();
 ctx.lineCap='square';ctx.lineJoin='miter';
 if(b.kind==='samurai'){
  // layered kabuto crest, segmented chest scales and lacquered shoulder plates
  line([[x+42,y+9],[x+53,y+2],[x+w*.5,y-6],[x+w-53,y+2],[x+w-42,y+9]],'#596273',2);
  line([[x+47,y+14],[x+w*.5,y+4],[x+w-47,y+14]],'#b7bbc8',1);
  for(var sc=0;sc<4;sc++){
   var sy=y+48+sc*6;
   line([[x+43,sy],[x+56,sy+3],[cx-5,sy+2]],sc%2?'#b74a59':'#4a1e2d',2);
   line([[cx+5,sy+2],[x+w-56,sy+3],[x+w-43,sy]],sc%2?'#b74a59':'#4a1e2d',2);
  }
  // rivets and segmented sode shoulder armor
  for(var riv2=0;riv2<3;riv2++){
   ctx.fillStyle='#efb96d';ctx.fillRect(x+10,y+43+riv2*9,3,3);ctx.fillRect(x+w-13,y+43+riv2*9,3,3);
  }
  line([[x+17,y+43],[x+28,y+48],[x+26,y+65]],'#a14b5a',2);
  line([[x+w-17,y+43],[x+w-28,y+48],[x+w-26,y+65]],'#a14b5a',2);
 }else if(b.kind==='siege'){
  // twin barrel mouths, recessed barrel bores, recoil rails and heavy chest bevels
  for(var gun=0;gun<2;gun++){
   var gx=x+(gun? w-31:31);
   ctx.fillStyle='#111923';ctx.fillRect(gx-7,y-4,14,10);
   ctx.strokeStyle='#e4b66b';ctx.lineWidth=2;ctx.strokeRect(gx-7,y-4,14,10);
   ctx.fillStyle='#050a11';ctx.fillRect(gx-3,y-2,6,5);
   ctx.fillStyle=glow;ctx.fillRect(gx-1,y-1,2,2);
   line([[gx-8,y+8],[gx-8,y+25],[gx-4,y+30]],'#9aa5ad',2);
   line([[gx+8,y+8],[gx+8,y+25],[gx+4,y+30]],'#9aa5ad',2);
  }
  line([[x+31,y+34],[x+42,y+29],[cx-21,y+32]],'#a8b0b5',2);
  line([[cx+21,y+32],[x+w-42,y+29],[x+w-31,y+34]],'#a8b0b5',2);
  // warning stencils and individual fasteners across the front plate
  for(var mark=0;mark<4;mark++){
   ctx.fillStyle=mark%2?'#ffca65':'#c7cdd0';
   ctx.fillRect(x+44+mark*12,y+69,5,2);
  }
  for(var bolt2=0;bolt2<4;bolt2++){
   ctx.fillStyle='#101720';ctx.fillRect(x+18+bolt2*9,y+h*.72,4,4);
   ctx.fillStyle='#a9b0b4';ctx.fillRect(x+19+bolt2*9,y+h*.72+1,2,1);
  }
 }else if(b.kind==='drone'){
  // layered diamond armor, panel joins, antenna sockets and thruster housings
  poly([[cx,y-7],[cx+11,y+11],[cx,y+24],[cx-11,y+11]],'#10273c','#55dff5',1);
  line([[x+w*.5,y+3],[x+w*.5,y+17]],'#d1fbff',2);
  line([[x+w*.5-7,y+20],[x+w*.5,y+24],[x+w*.5+7,y+20]],'#35a9d1',2);
  for(var panel=0;panel<3;panel++){
   var py=y+34+panel*7;
   line([[x+9,py],[x+25,py+2],[x+37,py]],panel===1?'#67eaff':'#287ca1',2);
   line([[x+w-9,py],[x+w-25,py+2],[x+w-37,py]],panel===1?'#67eaff':'#287ca1',2);
  }
  for(var node=0;node<4;node++){
   var nx=x+18+node*11;
   ctx.fillStyle='#07131f';ctx.fillRect(nx,y+47,5,5);ctx.fillStyle=node%2?'#36b7dc':'#c4fbff';ctx.fillRect(nx+1,y+48,2,2);
   ctx.fillStyle='#07131f';ctx.fillRect(x+w-23-node*11,y+47,5,5);ctx.fillStyle=node%2?'#36b7dc':'#c4fbff';ctx.fillRect(x+w-22-node*11,y+48,2,2);
  }
  // three distinct engine bells with dark rims, cyan cores and short exhaust trails
  for(var engine=0;engine<3;engine++){
   var ex2=cx+(engine-1)*22;
   ctx.fillStyle='#07101d';ctx.fillRect(ex2-5,y+h-3,10,7);
   ctx.strokeStyle='#247e9f';ctx.lineWidth=2;ctx.strokeRect(ex2-5,y+h-3,10,7);
   ctx.fillStyle='#b7fbff';ctx.fillRect(ex2-2,y+h+1,4,3+pulse*2);
  }
 }else{
  // Kage: white crest teeth, faceted mask, shoulder armour and red blade cores
  line([[x+31,y+12],[x+43,y+19],[x+53,y+15]],'#8d91a2',2);
  line([[x+w-31,y+12],[x+w-43,y+19],[x+w-53,y+15]],'#8d91a2',2);
  poly([[x+46,y+22],[cx,y+28],[x+w-46,y+22],[x+w-51,y+31],[cx,y+35],[x+51,y+31]],'#0a101b','#74798b',2);
  line([[x+48,y+37],[cx-6,y+40],[cx,y+38],[cx+6,y+40],[x+w-48,y+37]],'#a9a8b7',1);
  for(var crest=0;crest<4;crest++){
   ctx.fillStyle=crest%2?'#aaa8b7':'#f0eaf0';
   ctx.fillRect(x+44+crest*7,y+1+(crest%2)*3,3,2);
   ctx.fillRect(x+w-47-crest*7,y+1+(crest%2)*3,3,2);
  }
  // armoured gauntlet seams and red-lit wrist guards
  line([[x+12,y+49],[x+24,y+54],[x+20,y+65]],'#777b8d',2);
  line([[x+w-12,y+49],[x+w-24,y+54],[x+w-20,y+65]],'#777b8d',2);
  ctx.fillStyle='#f34468';ctx.fillRect(x+9,y+57,7,3);ctx.fillRect(x+w-16,y+57,7,3);
  line([[x+1,y+25],[x+14,y+45]],'#fff0f4',2);line([[x+w-1,y+25],[x+w-14,y+45]],'#fff0f4',2);
 }
 ctx.restore();
 // Reference fidelity pass: high-density mechanical details, confined to the approved silhouettes.
 // Every accent follows the boss's existing material language; no new silhouette or extra appendages.
 ctx.save();
 if(b.kind==='samurai'){
  // Kabuto rivets, cheek guards, lamellar ties and layered forearm plates.
  for(var riv=0;riv<4;riv++){
   ctx.fillStyle='#e4b66e';ctx.fillRect(x+35+riv*7,y+12,2,2);
   ctx.fillRect(x+w-37-riv*7,y+12,2,2);
  }
  line([[x+43,y+29],[x+35,y+40],[x+43,y+48]],'#aeb5c2',2);
  line([[x+w-43,y+29],[x+w-35,y+40],[x+w-43,y+48]],'#aeb5c2',2);
  for(var tie=0;tie<3;tie++){
   ctx.fillStyle='#f2bd72';ctx.fillRect(x+44,y+53+tie*7,4,2);
   ctx.fillRect(x+w-48,y+53+tie*7,4,2);
  }
  line([[x+12,y+57],[x+22,y+62],[x+20,y+72]],'#b54a5a',2);
  line([[x+w-12,y+57],[x+w-22,y+62],[x+w-20,y+72]],'#b54a5a',2);
  line([[x+w-20,y+69],[x+w-8,y+81]],'#f0c17a',3);
  line([[x+w-19,y+70],[x+w-13,y+76]],'#59293a',1);
  line([[x+w-16,y+73],[x+w-10,y+79]],'#59293a',1);
 }else if(b.kind==='siege'){
  // Armor seams, bolts, heat vents and articulated hydraulic joints.
  for(var bolt=0;bolt<3;bolt++){
   ctx.fillStyle='#e3b76e';ctx.fillRect(x+12,y+35+bolt*8,3,3);
   ctx.fillRect(x+w-15,y+35+bolt*8,3,3);
  }
  line([[x+20,y+29],[x+31,y+35],[x+39,y+31]],'#929da4',2);
  line([[x+w-20,y+29],[x+w-31,y+35],[x+w-39,y+31]],'#929da4',2);
  for(var vent2=0;vent2<4;vent2++){
   ctx.fillStyle=vent2%2?'#ffb34a':'#252f39';
   ctx.fillRect(x+44+vent2*10,y+73,6,3);
  }
  ctx.fillStyle='#0b121b';
  ctx.fillRect(x+24,y+h*.67,10,5);ctx.fillRect(x+w-34,y+h*.67,10,5);
  ctx.strokeStyle='#9aa4aa';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x+29,y+h*.67+2);ctx.lineTo(x+37,y+h*.73);ctx.lineTo(x+44,y+h*.67+2);
  ctx.moveTo(x+w-29,y+h*.67+2);ctx.lineTo(x+w-37,y+h*.73);ctx.lineTo(x+w-44,y+h*.67+2);ctx.stroke();
 }else if(b.kind==='drone'){
  // Wing panel segmentation, sensor nodes, calibration ticks and separate exhaust throats.
  line([[x+w*.5,y-4],[x+w*.5,y+12]],'#b7f8ff',2);
  line([[x+w*.5-9,y+7],[x+w*.5,y+14],[x+w*.5+9,y+7]],'#55eaff',2);
  for(var sensor=0;sensor<2;sensor++){
   var sx=sensor?x+w-25:x+25;
   ctx.fillStyle='#07121f';ctx.beginPath();ctx.arc(sx,y+39,5,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#55eaff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(sx,y+39,3,0,Math.PI*2);ctx.stroke();
   ctx.fillStyle='#d9ffff';ctx.fillRect(sx-1,y+38,2,2);
  }
  for(var tick=0;tick<5;tick++){
   ctx.fillStyle=tick%2?'#2c91b7':'#9af7ff';
   ctx.fillRect(x+35+tick*9,y+51+(tick%2)*3,4,2);
   ctx.fillRect(x+w-39-tick*9,y+51+(tick%2)*3,4,2);
  }
  for(var exhaust=0;exhaust<3;exhaust++){
   var ex=x+w*.5+(exhaust-1)*22;
   ctx.fillStyle='#07121f';ctx.fillRect(ex-4,y+h-1,8,5);
   ctx.fillStyle=glow;ctx.fillRect(ex-2,y+h+1,4,4+pulse*2);
  }
 }else{
  // Kage mask engraving, segmented cowl, shoulder fasteners and twin blade guards.
  line([[x+39,y+19],[x+49,y+24],[x+59,y+21]],'#8b8d9e',2);
  line([[x+w-39,y+19],[x+w-49,y+24],[x+w-59,y+21]],'#8b8d9e',2);
  for(var maskDot=0;maskDot<3;maskDot++){
   ctx.fillStyle=maskDot===1?'#ff9ab0':'#65697d';
   ctx.fillRect(x+39+maskDot*5,y+42,2,2);
   ctx.fillRect(x+w-45+maskDot*5,y+42,2,2);
  }
  line([[x+18,y+48],[x+25,y+58],[x+20,y+68]],'#77798c',2);
  line([[x+w-18,y+48],[x+w-25,y+58],[x+w-20,y+68]],'#77798c',2);
  ctx.fillStyle='#d8d5e2';ctx.fillRect(x+12,y+57,4,3);ctx.fillRect(x+w-16,y+57,4,3);
  line([[x-7,y+24],[x+8,y+48]],'#ff9ab0',1);
  line([[x+w+7,y+24],[x+w-8,y+48]],'#ff9ab0',1);
 }
 ctx.restore();
 // Reference-specific weak point: each boss keeps its own signature reactor/visor geometry.
 var cx=x+w*.5,cy=y+h*.54,coreR=phase===3?15:12;
 ctx.save();ctx.shadowColor=glow;ctx.shadowBlur=phase===3?16:7;
 ctx.fillStyle='#080d16';
 if(b.kind==='samurai'){
  poly([[cx,cy-coreR-4],[cx+coreR,cy],[cx,cy+coreR+4],[cx-coreR,cy]],'#101521',edge,3);
  poly([[cx,cy-coreR],[cx+coreR-3,cy],[cx,cy+coreR],[cx-coreR+3,cy]],'#70283b',glow,2);
  ctx.fillStyle=glow;ctx.fillRect(cx-4,cy-2,8,4);
 }else if(b.kind==='siege'){
  ctx.beginPath();ctx.arc(cx,cy,coreR+4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e5a33e';ctx.lineWidth=5;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,coreR-2,0,Math.PI*2);ctx.fillStyle='#ff7d2c';ctx.fill();
  ctx.beginPath();ctx.arc(cx,cy,5,0,Math.PI*2);ctx.fillStyle='#fff0bc';ctx.fill();
 }else if(b.kind==='drone'){
  ctx.beginPath();ctx.arc(cx,cy,coreR+8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#247f9e';ctx.lineWidth=6;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,coreR+2,0,Math.PI*2);ctx.strokeStyle=glow;ctx.lineWidth=3;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,coreR-4,0,Math.PI*2);ctx.fillStyle='#9af7ff';ctx.fill();
  ctx.beginPath();ctx.arc(cx,cy,4,0,Math.PI*2);ctx.fillStyle='#f4ffff';ctx.fill();
 }else{
  ctx.beginPath();ctx.ellipse(cx,cy,coreR+7,coreR+3,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#642039';ctx.lineWidth=5;ctx.stroke();
  ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(cx,cy,coreR+1,coreR-1,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff0f4';ctx.fillRect(cx-2,cy-5,4,10);
 }
 ctx.restore();
 // Boss motion pass: idle mechanics remain alive even between attacks; each boss has a distinct motion signature.
 var motionT=(boss.pattern||0),idleBob=Math.sin(motionT*2.7)*1.7,charge= boss.attack>0 ? Math.min(1,boss.attack/.36) : 0;
 ctx.save();
 ctx.globalAlpha=.22+.12*Math.sin(motionT*4.2);
 ctx.strokeStyle=glow;ctx.lineWidth=1;
 if(b.kind==='samurai'){
  // Floating sparks around the katana and a short red blade charge.
  for(var sp=0;sp<5;sp++){var sa=motionT*1.8+sp*1.256;var sr=23+(sp%3)*8;ctx.fillStyle=sp%2?'#ffb36e':glow;ctx.fillRect(cx+Math.cos(sa)*sr,cy+Math.sin(sa)*sr*.7,2,2)}
  if(charge>.05){ctx.globalAlpha=.16+.28*charge;ctx.strokeStyle='#ff6278';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+w-12,y+18);ctx.lineTo(x+w+20+charge*18,y+45);ctx.stroke()}
 }else if(b.kind==='siege'){
  // Barrel heat and recoil flashes, deliberately behind the armor.
  var recoil=charge*5;
  for(var sg=0;sg<2;sg++){var sx2=x+(sg?w-31:31);ctx.fillStyle=charge>.05?'#fff0a3':'#ff9b35';ctx.globalAlpha=charge>.05?.55:.18+.14*Math.sin(motionT*5+sg);ctx.fillRect(sx2-3-recoil,y-1,6,3)}
  ctx.globalAlpha=.15+.1*Math.sin(motionT*2);ctx.fillStyle='#ff7d35';ctx.fillRect(x+16,y+h*.82,w-32,3);
 }else if(b.kind==='drone'){
  // Oscillating thrust cones and orbiting calibration nodes.
  for(var th=0;th<3;th++){var tx2=cx+(th-1)*22;var flame=4+3*(.5+.5*Math.sin(motionT*13+th*2));ctx.globalAlpha=.18+.2*Math.sin(motionT*9+th);ctx.fillStyle='#55eaff';ctx.beginPath();ctx.moveTo(tx2-3,y+h+3);ctx.lineTo(tx2,y+h+flame+9);ctx.lineTo(tx2+3,y+h+3);ctx.closePath();ctx.fill()}
  for(var orb=0;orb<4;orb++){var oa=motionT*1.25+orb*Math.PI/2;ctx.globalAlpha=.45;ctx.fillStyle='#c6ffff';ctx.fillRect(cx+Math.cos(oa)*34-1,cy+Math.sin(oa)*25-1,3,3)}
 }else{
  // Kage phase flicker and twin red afterimage slivers.
  var flicker=.5+.5*Math.sin(motionT*17);
  ctx.globalAlpha=.09+.13*flicker;ctx.fillStyle='#ff315c';ctx.fillRect(x-8,y+20,w+16,h*.45);
  if(boss.phase>=2){ctx.globalAlpha=.18+.18*flicker;ctx.fillStyle='#ff315c';ctx.fillRect(x-13-Math.sin(motionT*6)*4,y+34,w*.22,h*.42);ctx.fillRect(x+w-3+Math.sin(motionT*6)*4,y+34,w*.22,h*.42)}
 }
 // Boss rig: solve elbow positions from shoulder and wrist targets; drone wings stay on their own rig.
 if(b.kind!=='drone'){
  var reach=Math.max(8,Math.min(22,w*.22)),armPose=rp.rightArm+rp.weaponRecoil;
  rn.wristL.x=x+w*.1+Math.sin(rp.leftArm)*3;rn.wristL.y=y+h*.68+Math.cos(rp.leftArm)*2;
  rn.wristR.x=x+w*.9+Math.sin(armPose)*4;rn.wristR.y=y+h*.68+Math.cos(armPose)*3;
  rigSolve2Bone(rn.elbowL,rn.shoulderL.x,rn.shoulderL.y,rn.wristL.x,rn.wristL.y,reach,reach,1);
  rigSolve2Bone(rn.elbowR,rn.shoulderR.x,rn.shoulderR.y,rn.wristR.x,rn.wristR.y,reach,reach,-1);
  drawRigLink(rn.shoulderL.x,rn.shoulderL.y,rn.elbowL.x,rn.elbowL.y,edge,b.metal,Math.max(2,w*.035));
  drawRigLink(rn.elbowL.x,rn.elbowL.y,rn.wristL.x,rn.wristL.y,edge,b.armor,Math.max(2,w*.03));
  drawRigHinge(rn.elbowL.x,rn.elbowL.y,Math.max(2,w*.025),edge,glow);
  drawRigLink(rn.shoulderR.x,rn.shoulderR.y,rn.elbowR.x,rn.elbowR.y,edge,b.metal,Math.max(2,w*.035));
  drawRigLink(rn.elbowR.x,rn.elbowR.y,rn.wristR.x,rn.wristR.y,edge,b.armor,Math.max(2,w*.03));
  drawRigHinge(rn.elbowR.x,rn.elbowR.y,Math.max(2,w*.025),edge,glow);
 }
 ctx.restore();
 // Reference-faithful attack cue: thin, restrained and unique to each silhouette.
 if(boss.attack>0){ctx.save();ctx.globalAlpha=.18+.12*pulse;ctx.strokeStyle=glow;ctx.lineWidth=1;
  if(b.kind==='samurai'){ctx.beginPath();ctx.moveTo(cx-24,cy+19);ctx.lineTo(cx,cy+25+4*pulse);ctx.lineTo(cx+24,cy+19);ctx.stroke()}
  else if(b.kind==='siege'){ctx.strokeRect(cx-24,cy-19,48,38)}
  else if(b.kind==='drone'){ctx.beginPath();ctx.arc(cx,cy,24+3*pulse,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,30+3*pulse,0,Math.PI*2);ctx.stroke()}
  else{ctx.beginPath();ctx.moveTo(cx-23,cy-17);ctx.lineTo(cx-10,cy);ctx.lineTo(cx-23,cy+17);ctx.moveTo(cx+23,cy-17);ctx.lineTo(cx+10,cy);ctx.lineTo(cx+23,cy+17);ctx.stroke()}
  ctx.restore()}
 ctx.restore();
}
function drawMenuBackdrop(){
 var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#06112c');g.addColorStop(.42,'#18284c');g.addColorStop(.72,'#301b2b');g.addColorStop(1,'#080b13');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 for(var i=0;i<54;i++){var sx=(i*47+13)%W,sy=(i*83+17)%(H*.52);ctx.fillStyle=i%5===0?'#ffb4c9':'#d8e7ff';ctx.globalAlpha=.35+(i%4)*.14;ctx.fillRect(sx,sy,i%7===0?2:1,1)}ctx.globalAlpha=1;
 var moon=ctx.createRadialGradient(W*.78,H*.13,2,W*.78,H*.13,38);moon.addColorStop(0,'#fff7d5');moon.addColorStop(.6,'#a9d8ff');moon.addColorStop(1,'rgba(114,172,255,0)');ctx.fillStyle=moon;ctx.beginPath();ctx.arc(W*.78,H*.13,38,0,Math.PI*2);ctx.fill();ctx.fillStyle='#dcecff';ctx.beginPath();ctx.arc(W*.78,H*.13,16,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#111a35';ctx.beginPath();ctx.moveTo(0,H*.36);for(var m=0;m<=8;m++)ctx.lineTo(m*W/8,H*(.27+(m%3)*.035));ctx.lineTo(W,H*.48);ctx.lineTo(0,H*.48);ctx.closePath();ctx.fill();
 for(var f=0;f<5;f++){var fx=W*(.12+f*.16),fy=H*(.29+(f%2)*.025);ctx.fillStyle='#26324b';ctx.beginPath();ctx.arc(fx,fy,15,Math.PI,0);ctx.lineTo(fx+13,fy+17);ctx.lineTo(fx-13,fy+17);ctx.closePath();ctx.fill();ctx.fillStyle='#101827';ctx.fillRect(fx-9,fy-1,18,4);ctx.fillStyle='#34435b';ctx.fillRect(fx-5,fy+5,3,5);ctx.fillRect(fx+3,fy+5,3,5)}
 for(var b=0;b<13;b++){var bx=(b*31)%W,by=H*(.31+(b%5)*.025),bh=H*(.09+(b%4)*.025);ctx.fillStyle=b%2?'#121c30':'#1b2034';ctx.fillRect(bx,by,24,bh);ctx.fillStyle='#e85a3a';ctx.fillRect(bx-2,by,28,3);for(var wy=by+8;wy<by+bh-3;wy+=10){ctx.fillStyle=(b+wy)%3?'#ff9c4a':'#ffd27a';ctx.fillRect(bx+5,wy,3,4);ctx.fillRect(bx+15,wy,3,4)}}
 // Foreground Ichiraku shop: roof, glowing sign, counter and stools.
 ctx.fillStyle='#080d18';ctx.beginPath();ctx.moveTo(-10,H*.56);ctx.lineTo(W*.46,H*.42);ctx.lineTo(W+10,H*.55);ctx.lineTo(W+10,H*.6);ctx.lineTo(-10,H*.61);ctx.closePath();ctx.fill();ctx.strokeStyle='#e94c32';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,H*.56);ctx.lineTo(W*.46,H*.42);ctx.lineTo(W+8,H*.55);ctx.stroke();
 ctx.fillStyle='#351c22';ctx.fillRect(0,H*.57,W,H*.28);ctx.fillStyle='#f36a36';ctx.fillRect(0,H*.57,W,4);ctx.fillStyle='#ffc36c';ctx.fillRect(W*.12,H*.59,W*.76,H*.105);ctx.fillStyle='#9e282b';ctx.font='bold '+Math.max(14,W*.065)+'px sans-serif';ctx.textAlign='center';ctx.fillText('ラーメン',W*.5,H*.655);ctx.textAlign='start';
 ctx.fillStyle='#5b2924';ctx.fillRect(0,H*.705,W,H*.11);ctx.fillStyle='#f89a43';ctx.fillRect(0,H*.705,W,3);for(var st=0;st<5;st++){var tx=W*(.12+st*.17);ctx.fillStyle='#080d18';ctx.fillRect(tx,H*.76,5,H*.065);ctx.fillStyle='#e33e35';ctx.fillRect(tx-4,H*.748,13,5)}
 for(var ln=0;ln<7;ln++){var lx=W*(.04+ln*.15),ly=H*(.47+(ln%2)*.045);ctx.fillStyle='#ff8b35';ctx.fillRect(lx,ly,8,19);ctx.fillStyle='#ffe3a0';ctx.fillRect(lx+2,ly+3,4,13);ctx.fillStyle='#7b3030';ctx.fillRect(lx-2,ly-3,12,3)}
 // Blossoms and drifting petals.
 for(var p=0;p<24;p++){var px=(p*59+Math.floor(performance.now()/90)*(p%3+1))%W,py=(p*71+Math.floor(performance.now()/130)*(p%4+1))%H;ctx.fillStyle=p%3?'#ff8eb9':'#ffd0dc';ctx.globalAlpha=.45+(p%4)*.12;ctx.fillRect(px,py,2,3)}ctx.globalAlpha=1;
 var vign=ctx.createRadialGradient(W*.5,H*.48,H*.15,W*.5,H*.48,H*.75);vign.addColorStop(0,'rgba(0,0,0,0)');vign.addColorStop(1,'rgba(0,0,0,.42)');ctx.fillStyle=vign;ctx.fillRect(0,0,W,H);
}
function drawAtmosphere(){
 var skies=[['#10182e','#283b56','#69434a','#10121c'],['#071b38','#174b70','#3d7390','#07111f'],['#260d16','#61251e','#a34a27','#160b12'],['#03151b','#0a3038','#15515a','#03090f']];var sc=skies[levelTheme]||skies[0],sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,sc[0]);sky.addColorStop(.38,sc[1]);sky.addColorStop(.72,sc[2]);sky.addColorStop(1,sc[3]);ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 // Distant stars and moon: fixed to the screen for a calm layered parallax effect.
 for(var s=0;s<46;s++){var sx=(s*67+19)%W,sy=(s*43+11)%(H*.47);ctx.globalAlpha=.08+(s%4)*.045;ctx.fillStyle=s%7===0?'#ffb5a0':'#b9dfff';ctx.fillRect(sx,sy,s%9===0?2:1,1)}
 ctx.globalAlpha=1;
 var mx=W*.82,my=H*.105;if(levelTheme===2){var furnace=ctx.createRadialGradient(mx,my,2,mx,my,58);furnace.addColorStop(0,'rgba(255,183,66,.5)');furnace.addColorStop(.35,'rgba(255,70,34,.22)');furnace.addColorStop(1,'rgba(255,40,20,0)');ctx.fillStyle=furnace;ctx.fillRect(mx-60,my-60,120,120);ctx.fillStyle='#ffb34e';ctx.beginPath();ctx.arc(mx,my,13,0,Math.PI*2);ctx.fill()}else if(levelTheme===3){ctx.strokeStyle='rgba(74,244,209,.22)';ctx.lineWidth=2;for(var ring=0;ring<4;ring++){ctx.beginPath();ctx.ellipse(mx,my,16+ring*10,7+ring*6,0,0,Math.PI*2);ctx.stroke()}}else{var mn=ctx.createRadialGradient(mx,my,3,mx,my,35);mn.addColorStop(0,levelTheme===1?'rgba(194,231,255,.5)':'rgba(255,222,177,.34)');mn.addColorStop(.38,levelTheme===1?'rgba(87,176,255,.16)':'rgba(255,136,105,.12)');mn.addColorStop(1,'rgba(255,100,70,0)');ctx.fillStyle=mn;ctx.fillRect(mx-36,my-36,72,72);ctx.fillStyle=levelTheme===1?'#d7f0ff':'#e7d7cb';ctx.beginPath();ctx.arc(mx,my,10,0,Math.PI*2);ctx.fill();ctx.fillStyle=levelTheme===1?'#a6c8eb':'#aeb9d1';ctx.beginPath();ctx.arc(mx+4,my-3,9,0,Math.PI*2);ctx.fill()}
 // Distant industrial gantries and ventilation stacks create a layered facility silhouette.
 ctx.fillStyle='#0b1422';ctx.fillRect(0,H*.405,W,H*.025);
 for(var g=0;g<5;g++){var gx=((g*91-cam*.12)%(W+80)+W+80)%(W+80)-35,gy=H*(.38+(g%2)*.045),gw=44+(g%3)*12;
  ctx.fillStyle='#111b2b';ctx.fillRect(gx,gy,gw,5);ctx.fillRect(gx+3,gy+5,3,H*.11);ctx.fillRect(gx+gw-6,gy+5,3,H*.11);
  ctx.fillStyle='#304257';ctx.fillRect(gx+4,gy+2,gw-8,2);ctx.fillStyle='#ff9c43';ctx.fillRect(gx+8,gy+7,4,2);ctx.fillStyle='#35d8eb';ctx.fillRect(gx+gw-13,gy+7,5,2);
 }
 // Hanging cables, pipe elbows, vents and hazard-lit service panels.
 ctx.strokeStyle='#080f1d';ctx.lineWidth=3;
 for(var cable=0;cable<4;cable++){var cx=((cable*103-cam*.19)%(W+90)+W+90)%(W+90)-30,cy=H*(.43+(cable%2)*.045);ctx.beginPath();ctx.moveTo(cx,cy);ctx.bezierCurveTo(cx+8,cy+7,cx+19,cy+7,cx+27,cy+1);ctx.stroke();ctx.strokeStyle='#35445a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx,cy);ctx.bezierCurveTo(cx+8,cy+6,cx+19,cy+6,cx+27,cy+1);ctx.stroke();ctx.strokeStyle='#080f1d';ctx.lineWidth=3;}
 // Mountain silhouette and multiple skyline planes.
 ctx.fillStyle='#11182a';ctx.beginPath();ctx.moveTo(0,H*.34);for(var m=0;m<=8;m++)ctx.lineTo(m*W/8,H*(.25+(m%3)*.035));ctx.lineTo(W,H*.43);ctx.lineTo(0,H*.43);ctx.closePath();ctx.fill();
 for(var layer=0;layer<3;layer++){var parallax=[.08,.16,.25][layer],base=[H*.47,H*.54,H*.62][layer],widths=[38,47,34][layer];for(var b=0;b<13;b++){var bw=widths+(b*11%17),bh=38+(b*31%76),bx=((b*47-cam*parallax)%(W+bw)+W+bw)%(W+bw)-bw,by=base-bh+(b%3)*4;var wall=ctx.createLinearGradient(bx,by,bx+bw,by);wall.addColorStop(0,layer===0?'#20243a':layer===1?'#241e2d':'#201a27');wall.addColorStop(1,layer===0?'#121a2b':layer===1?'#151622':'#11121b');ctx.fillStyle=wall;ctx.fillRect(bx,by,bw,bh);ctx.fillStyle=layer===2?'#693c43':'#54313b';ctx.fillRect(bx,by,bw,3);ctx.fillStyle='#ffad64';for(var wy=by+10;wy<base-4;wy+=12){for(var wx=bx+5;wx<bx+bw-4;wx+=11){if(((Math.floor(wx+wy)+b)%4)!==0){ctx.globalAlpha=.18+(b%3)*.055;ctx.fillRect(wx,wy,3,5)}}}ctx.globalAlpha=1;if(b%4===0){ctx.fillStyle='#ff704b';ctx.fillRect(bx+bw*.5,by-4,2,5);ctx.fillStyle='#43d9e7';ctx.fillRect(bx+bw*.5+3,by-1,4,1)}}}
 // Distinct landmark silhouettes: pagoda roofs, furnace stacks, or a sealed vault bulkhead.\n if(levelTheme===1){for(var pag=0;pag<4;pag++){var px=pag*102-((cam*.08)%102)-12,py=H*(.39+(pag%2)*.045);ctx.fillStyle='#0a2039';ctx.fillRect(px+18,py,8,H*.18);ctx.fillStyle='#163b59';ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+22,py-12);ctx.lineTo(px+44,py);ctx.lineTo(px+39,py+4);ctx.lineTo(px+5,py+4);ctx.closePath();ctx.fill();ctx.fillStyle='#4b9bb8';ctx.fillRect(px+8,py+5,28,2);ctx.fillStyle='#ffb7d0';ctx.fillRect(px+20,py+15,3,5)}}else if(levelTheme===2){for(var st=0;st<5;st++){var fx=st*83-((cam*.14)%83),fy=H*(.31+(st%3)*.035),fw=18+(st%2)*8;ctx.fillStyle='#180e18';ctx.fillRect(fx,fy,fw,H*.22);ctx.fillStyle='#472027';ctx.fillRect(fx-3,fy,fw+6,5);ctx.fillStyle='#ff6236';ctx.fillRect(fx+4,fy+10,3,Math.max(4,H*.12));ctx.fillStyle='#ffb84d';ctx.fillRect(fx+fw-7,fy+19,4,3)}for(var ember=0;ember<22;ember++){var ex=(ember*37+Math.floor(performance.now()/90)*(ember%3+1))%W,ey=(ember*29+Math.floor(performance.now()/65)*(ember%4+1))%(H*.56);ctx.globalAlpha=.2+(ember%4)*.1;ctx.fillStyle=ember%2?'#ff6236':'#ffc35b';ctx.fillRect(ex,ey,2,2)}ctx.globalAlpha=1}else if(levelTheme===3){ctx.fillStyle='#06151b';ctx.fillRect(0,H*.34,W,H*.25);for(var vault=0;vault<5;vault++){var vx=vault*82-((cam*.06)%82);ctx.fillStyle='#0b252d';ctx.fillRect(vx,H*.31,58,H*.31);ctx.fillStyle='#20515a';ctx.fillRect(vx,H*.31,58,3);ctx.fillRect(vx+4,H*.34,2,H*.26);ctx.fillRect(vx+52,H*.34,2,H*.26);ctx.fillStyle='#36d8bf';ctx.globalAlpha=.45;ctx.fillRect(vx+12,H*.39,34,2);ctx.fillRect(vx+12,H*.48,34,2);ctx.globalAlpha=1}}\n // Living architecture: every level has animated windows, screens, beacons and moving light.
 var tick=performance.now()*.001;
 var windowCols=levelTheme===1?['#77dfff','#c2efff','#ff8eb9']:levelTheme===2?['#ff7139','#ffb84d','#ffdc83']:levelTheme===3?['#35e7ca','#77fff0','#168d9b']:['#ffb45e','#55d9ef','#ff6657'];
 for(var wl=0;wl<3;wl++){
  var wp=[.08,.16,.25][wl],wb=[H*.47,H*.54,H*.62][wl],ww=[38,47,34][wl];
  for(var wi=0;wi<13;wi++){
   var bw=ww+(wi*11%17),bh=38+(wi*31%76),bx=((wi*47-cam*wp)%(W+bw)+W+bw)%(W+bw)-bw,by=wb-bh+(wi%3)*4;
   for(var wy=by+10;wy<wb-5;wy+=12){
    for(var wx=bx+5;wx<bx+bw-4;wx+=11){
     var pulse=.55+.35*Math.sin(tick*(1.1+(wi%4)*.23)+wi*1.7+wy*.04);
     var lit=((wi*7+Math.floor(wy/12)+Math.floor(tick*(.6+(wi%3)*.2)))%7)!==0;
     if(lit){ctx.globalAlpha=.18+pulse*.16;ctx.fillStyle=windowCols[(wi+Math.floor(wy/12)+wl)%windowCols.length];ctx.fillRect(wx,wy,3,5)}
    }
   }
  }
 }
 ctx.globalAlpha=1;
 // Moving scan lights across the skyline; their parallax makes the scene feel deeper.
 for(var beam=0;beam<3;beam++){
  var lx=((tick*(18+beam*9)+beam*W*.39)%(W+90))-45,ly=H*(.37+beam*.045);
  ctx.globalAlpha=.025+.015*Math.sin(tick*2+beam);
  ctx.fillStyle=windowCols[beam%windowCols.length];
  ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(lx+9,ly);ctx.lineTo(lx+31,H*.62);ctx.lineTo(lx+17,H*.62);ctx.closePath();ctx.fill();
  ctx.globalAlpha=.32;ctx.fillRect(lx,ly,10,2);
 }
 ctx.globalAlpha=1;
 // Vent steam and drifting motes are deterministic and allocation-free per frame.
 for(var vent=0;vent<5;vent++){
  var vx=((vent*W*.23-cam*.21)%(W+30)+W+30)%(W+30),vy=H*(.57+(vent%3)*.065);
  var drift=(tick*(7+vent*1.7))%22;
  ctx.globalAlpha=.08+.05*Math.sin(tick*1.8+vent);
  ctx.fillStyle=levelTheme===1?'#9ddfff':levelTheme===2?'#ff9a5a':levelTheme===3?'#54f5dc':'#d4e6f7';
  ctx.fillRect(vx+Math.sin(tick+vent)*3,vy-drift,2,7);
  ctx.fillRect(vx+4+Math.sin(tick*.8+vent)*4,vy-drift-5,2,5);
 }
 ctx.globalAlpha=1;
 // Window activity: tiny silhouettes move behind lit windows; warning lights react to combat intensity.
 var actionTime=performance.now()*.001;
 var danger=(typeof boss!=='undefined'&&boss.active&&!boss.dead)?(boss.phase||1):0;
 var combatPulse=(typeof p!=='undefined'&&p.atk>0)?1:0;
 for(var wl2=0;wl2<3;wl2++){
  var par=[.08,.16,.25][wl2],base2=[H*.47,H*.54,H*.62][wl2],width2=[38,47,34][wl2];
  for(var wi2=0;wi2<13;wi2++){
   var bw2=width2+(wi2*11%17),bh2=38+(wi2*31%76),bx2=((wi2*47-cam*par)%(W+bw2)+W+bw2)%(W+bw2)-bw2,by2=base2-bh2+(wi2%3)*4;
   for(var row=0;row<3;row++){
    var wy2=by2+12+row*13;
    if(wy2>=base2-5)continue;
    var wx2=bx2+7+((wi2+row)%3)*10;
    if(wx2>bx2+bw2-7)continue;
    var moving=((actionTime*(5+wi2%4)+wi2*13+row*17)%28);
    var wc=levelTheme===1?'#9ce6ff':levelTheme===2?'#ffb347':levelTheme===3?'#5cf5d6':'#ffc078';
    ctx.globalAlpha=.10+.08*Math.sin(actionTime*2+wi2+row);
    ctx.fillStyle=wc;
    ctx.fillRect(wx2+moving*.12,wy2,2,3);
    ctx.fillRect(wx2-1+moving*.12,wy2+3,4,2);
   }
  }
 }
 ctx.globalAlpha=1;
 // Combat state changes the world's lighting: boss phases trigger local emergency strobes.
 if(danger>=2){
  var alarm=.045+.045*(.5+.5*Math.sin(actionTime*(danger===3?9:5)));
  ctx.fillStyle=levelTheme===3?'rgba(255,45,94,'+alarm+')':levelTheme===1?'rgba(80,190,255,'+alarm+')':'rgba(255,74,44,'+alarm+')';
  ctx.fillRect(0,H*.25,W,H*.42);
  for(var beacon=0;beacon<4;beacon++){
   var bxx=((beacon*W*.31+actionTime*(danger===3?35:19))%(W+18))-9;
   ctx.globalAlpha=.25+.5*(.5+.5*Math.sin(actionTime*8+beacon));
   ctx.fillStyle=levelTheme===1?'#71dfff':levelTheme===3?'#42f4d4':'#ff4b42';
   ctx.fillRect(bxx,H*.39+(beacon%2)*H*.035,7,2);
  }
  ctx.globalAlpha=1;
 }
 // Shot flashes softly illuminate the scenery instead of covering the combat silhouettes.
 if(combatPulse){
  ctx.globalAlpha=.015;
  ctx.fillStyle=levelTheme===1?'#65dfff':levelTheme===3?'#47ffe0':'#ff9a45';
  ctx.fillRect(0,H*.3,W,H*.5);
  ctx.globalAlpha=1;
 }
 // Foreground atmospheric motion, tuned per biome and kept behind gameplay entities.
 var ambientT=performance.now()*.001;
 for(var mote=0;mote<26;mote++){
  var seedX=(mote*71+13)%Math.max(1,W),seedY=(mote*47+9)%Math.max(1,H*.64);
  var fall=levelTheme===1?8+mote%9:levelTheme===2?18+mote%17:levelTheme===3?5+mote%8:10+mote%11;
  var driftX=levelTheme===1?Math.sin(ambientT*.8+mote)*10:levelTheme===2?Math.sin(ambientT*1.4+mote)*4:levelTheme===3?Math.sin(ambientT*.45+mote)*3:Math.sin(ambientT+mote)*6;
  var ax=(seedX+driftX+(levelTheme===2?ambientT*fall*.65:ambientT*fall*.2))%W;
  var ay=(seedY+ambientT*fall)%Math.max(1,H*.64);
  ctx.globalAlpha=.07+.09*(.5+.5*Math.sin(ambientT*2+mote));
  ctx.fillStyle=levelTheme===1?(mote%3?'#9adfff':'#ffb8d0'):levelTheme===2?(mote%3?'#ff6a37':'#ffd06c'):levelTheme===3?(mote%3?'#4ff2d6':'#a0fff0'):(mote%3?'#70dff1':'#ffc17a');
  if(levelTheme===1){ctx.save();ctx.translate(ax,ay);ctx.rotate(ambientT*.5+mote);ctx.fillRect(-2,-1,4,2);ctx.restore()}
  else if(levelTheme===2){ctx.fillRect(ax,ay,2,4+mote%3)}
  else if(levelTheme===3){ctx.fillRect(ax,ay,1,5)}
  else{ctx.fillRect(ax,ay,2,2)}
 }
 ctx.globalAlpha=1;
 // Warm ground haze and subtle vignette keep the player and platform silhouettes readable.
 var haze=ctx.createLinearGradient(0,H*.5,0,H);haze.addColorStop(0,'rgba(255,105,67,0)');haze.addColorStop(.7,'rgba(255,90,61,.045)');haze.addColorStop(1,'rgba(0,0,0,.32)');ctx.fillStyle=haze;ctx.fillRect(0,0,W,H);
 var vg=ctx.createRadialGradient(W*.5,H*.46,70,W*.5,H*.46,260);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.34)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
 // Grade only the scenery; platforms and combat actors are drawn afterwards.
 ctx.save();ctx.globalCompositeOperation='source-over';
 var grade=ctx.createLinearGradient(0,0,0,H);
 grade.addColorStop(0,'rgba(2,6,14,.38)');
 grade.addColorStop(.34,'rgba(3,7,15,.34)');
 grade.addColorStop(.68,'rgba(4,7,13,.28)');
 grade.addColorStop(1,'rgba(3,6,12,.22)');
 ctx.fillStyle=grade;ctx.fillRect(0,0,W,H);
 var focus=ctx.createRadialGradient(W*.5,H*.48,Math.max(1,H*.05),W*.5,H*.48,Math.max(W,H)*.72);
 focus.addColorStop(0,'rgba(0,0,0,0)');
 focus.addColorStop(.7,'rgba(0,0,0,.04)');
 focus.addColorStop(1,'rgba(0,0,0,.20)');
 ctx.fillStyle=focus;ctx.fillRect(0,0,W,H);ctx.restore();
}
function drawLightingOverlay(){
 // Lightweight screen-space 2D lighting: fixed ambient base + a few moving local lights.
 // Keep the pass bounded for low-end Android; no shadow-casting or full-screen blur.
 var t=performance.now()*.001,unit=Math.max(1,Math.min(W,H)),px=p.x+p.w*.5-cam,py=p.y+p.h*.5-camY;
 var oldComp=ctx.globalCompositeOperation,oldAlpha=ctx.globalAlpha;
 // Subtle cinematic vignette protects contrast behind the HUD without crushing the center.
 ctx.save();ctx.globalCompositeOperation='source-over';
 var vig=ctx.createRadialGradient(W*.5,H*.46,unit*.18,W*.5,H*.5,unit*.78);
 vig.addColorStop(0,'rgba(1,5,13,0)');vig.addColorStop(.68,'rgba(1,4,12,.07)');vig.addColorStop(1,'rgba(1,3,10,.27)');
 ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);ctx.restore();
 function glowLight(x,y,r,color,a){
  if(x<-r||x>W+r||y<-r||y>H+r)return;
  var g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color.replace('ALPHA',String(a)));
  g.addColorStop(.35,color.replace('ALPHA',String(a*.42)));
  g.addColorStop(1,color.replace('ALPHA','0'));
  ctx.fillStyle=g;ctx.fillRect(Math.max(0,x-r),Math.max(0,y-r),Math.min(W,x+r)-Math.max(0,x-r),Math.min(H,y+r)-Math.max(0,y-r));
 }
 ctx.save();ctx.globalCompositeOperation='screen';
 var playerColor=levelTheme===1?'rgba(89,207,255,ALPHA)':levelTheme===2?'rgba(255,126,57,ALPHA)':levelTheme===3?'rgba(63,255,213,ALPHA)':'rgba(255,174,94,ALPHA)';
 var breathe=.82+.12*Math.sin(t*3.2);
 glowLight(px,py,unit*.22,playerColor,.18*breathe);
 // Foot-level bounce and reflection give the operator a visual connection to the platform.
 glowLight(px,Math.min(H-2,py+p.h*.48),unit*.12,playerColor,.12+.035*Math.sin(t*7));
 if(p.atk>0){
  var mx=px+(p.face||1)*unit*.055,my=py-p.h*.08;
  glowLight(mx,my,unit*.105,'rgba(255,221,155,ALPHA)',Math.min(.36,p.atk*2.1));
 }
 if(p.shield>0)glowLight(px,py,unit*.27,'rgba(74,225,255,ALPHA)',.12+.06*Math.sin(t*8));
 // Boss reactor is the strongest local source; its pulse rises as its health drops.
 if(boss.active&&!boss.dead){
  var bx=boss.x+boss.w*.5-cam,by=boss.y+boss.h*.54-camY;
  var bcol=boss.kind==='drone'?'rgba(74,230,255,ALPHA)':boss.kind==='siege'?'rgba(255,151,55,ALPHA)':boss.kind==='samurai'?'rgba(255,59,91,ALPHA)':'rgba(255,45,99,ALPHA)';
  var danger=1-Math.max(0,boss.hp)/Math.max(1,boss.maxHp),pulse=.78+.22*Math.sin(t*(3+danger*5));
  glowLight(bx,by,unit*(.27+danger*.06),bcol,(.17+danger*.12)*pulse);
  if((boss.attack||0)>.02)glowLight(bx,by,unit*.34,bcol,.10+.12*Math.sin(t*13));
 }
 // Projectile glows: capped to the first six live bolts to keep the lighting pass predictable.
 var lit=0;
 for(var bi=0;bi<bullets.length&&lit<6;bi++){
  var bl=bullets[bi],lx=bl.x-cam,ly=bl.y-camY;
  if(lx>-20&&lx<W+20&&ly>-20&&ly<H+20){
   glowLight(lx,ly,unit*.045,bl.owner==='p'?'rgba(255,224,151,ALPHA)':'rgba(255,75,105,ALPHA)',.22);
   lit++;
  }
 }
 // A moving scan beam sweeps the upper architecture, changing hue with the biome.
 var scanX=((t*unit*.12)%(W+unit*.2))-unit*.1;
 ctx.globalAlpha=.025+.012*Math.sin(t*2.3);
 ctx.fillStyle=levelTheme===1?'#58cfff':levelTheme===2?'#ff8b45':levelTheme===3?'#43f4d1':'#ffbd78';
 ctx.beginPath();ctx.moveTo(scanX,H*.18);ctx.lineTo(scanX+unit*.025,H*.18);ctx.lineTo(scanX+unit*.11,H*.53);ctx.lineTo(scanX+unit*.075,H*.53);ctx.closePath();ctx.fill();
 ctx.restore();ctx.globalCompositeOperation=oldComp;ctx.globalAlpha=oldAlpha;
}
function draw(){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);worldShakeX=worldShake>0?Math.sin(performance.now()*.071)*worldShake:0;worldShakeY=worldShake>0?Math.cos(performance.now()*.093)*worldShake*.58:0;ctx.setTransform(scale*dpr,0,0,scale*dpr,(ox+worldShakeX)*dpr,(oy+worldShakeY)*dpr);if(state==='MENU'){drawMenuBackdrop();return}drawAtmosphere();drawPickups();ctx.save();ctx.translate(-cam,-camY);platforms.forEach(function(q){var pg=ctx.createLinearGradient(0,q.y,0,q.y+q.h);var palettes=[['#ffbd72','#ed7749','#82404a','#302332','#0d111c'],['#b8e7ff','#559ac5','#315b7a','#182b43','#071423'],['#ffc36a','#d45a32','#71352b','#2d1a22','#100c14'],['#86f5dc','#318c91','#214c5b','#102632','#050d14']];var pal=palettes[levelTheme]||palettes[0];var metalTop=['#ffb36b','#a9e6ff','#ff9b43','#6fffe0'][levelTheme]||'#ffb36b';var metalEdge=['#b84e42','#397ba3','#a64027','#17656a'][levelTheme]||'#b84e42';pg.addColorStop(0,pal[0]);pg.addColorStop(.12,pal[1]);pg.addColorStop(.34,pal[2]);pg.addColorStop(.58,pal[3]);pg.addColorStop(1,pal[4]);ctx.fillStyle=pg;ctx.fillRect(q.x,q.y+2,q.w,q.h);ctx.save();ctx.shadowColor=metalTop;ctx.shadowBlur=q.y<230?8:4;ctx.fillStyle=metalTop;ctx.fillRect(q.x,q.y,q.w,2);ctx.restore();rect(q.x,q.y+3,q.w,2,metalEdge);rect(q.x+2,q.y+6,q.w-4,1,levelTheme===1?'#d9f6ff':levelTheme===2?'#ffc06a':levelTheme===3?'#7effdf':'#ffd28a');rect(q.x,q.y+q.h-3,q.w,3,'#090a11');rect(q.x+2,q.y+q.h-5,q.w-4,1,metalEdge);for(var tile=q.x;tile<q.x+q.w;tile+=24){if(levelTheme===1){rect(tile,q.y+7,14,2,'#315a7a');rect(tile+3,q.y+9,8,1,'#8bdfff')}else if(levelTheme===2){rect(tile,q.y+7,15,3,'#58252a');rect(tile+2,q.y+8,11,1,'#ff9a3d')}else if(levelTheme===3){rect(tile,q.y+7,12,2,'#103942');rect(tile+3,q.y+8,7,1,'#43d9bd')}else{rect(tile,q.y+7,12,2,'#704038');if(tile%3===0)rect(tile+15,q.y+8,4,2,'#00bcd4')}}for(var bolt=q.x+10;bolt<q.x+q.w-8;bolt+=32){rect(bolt,q.y+1,2,2,levelTheme===1?'#e5faff':levelTheme===2?'#ffdc88':levelTheme===3?'#9effe5':'#ffe4b0');rect(bolt+1,q.y+9,2,2,metalEdge)}
 // top bevel, inset service panels and diagonal hazard ticks
 rect(q.x+3,q.y+2,q.w-6,1,'#ffe0a2');for(var seam=q.x+18;seam<q.x+q.w-12;seam+=48){rect(seam,q.y+3,1,3,metalTop);rect(seam+2,q.y+4,7,1,metalEdge);rect(seam+4,q.y+5,5,1,levelTheme===1?'#8be8ff':levelTheme===2?'#ff7139':levelTheme===3?'#48e9ca':'#00bfd0')}
 if(q.y!==ground){for(var rib=q.x+12;rib<q.x+q.w-6;rib+=38){rect(rib,q.y+q.h,3,5,'#111a2a');rect(rib+1,q.y+q.h+1,1,3,'#647b8c');rect(rib+4,q.y+q.h+4,6,2,'#00cddd')}rect(q.x+5,q.y+q.h-1,Math.max(0,q.w-10),1,'#ffad57')}if(q.y<230){rect(q.x+4,q.y-6,q.w-8,2,'#3b2637');rect(q.x+6,q.y-3,q.w-12,2,'#00dff5');rect(q.x+8,q.y-1,q.w-16,2,'#ff7040')}if(q.y!==ground){for(var brace=q.x+18;brace<q.x+q.w-8;brace+=54){rect(brace,q.y+q.h,4,7,'#3b2730');rect(brace+1,q.y+q.h+1,2,4,'#ff9c3a');rect(brace+4,q.y+q.h+5,8,2,'#00bcd4')}}if(q.y===ground){rect(q.x,q.y+10,q.w,3,'#3a202b');for(var plate=q.x+8;plate<q.x+q.w-8;plate+=42){rect(plate,q.y+18,34,38,'#1a1722');rect(plate+2,q.y+20,30,2,'#3e2830');rect(plate+2,q.y+52,30,2,'#10111b');rect(plate+4,q.y+24,2,3,'#ff9c3a');rect(plate+28,q.y+24,2,3,'#00dff5')}for(var rib=q.x+20;rib<q.x+q.w;rib+=84){rect(rib,q.y+65,3,62,'#15131d');rect(rib+4,q.y+65,1,62,'#30202a')}}});consoles.forEach(function(q){rect(q.x,q.y-25,20,25,'#40242a');rect(q.x+3,q.y-20,14,10,'#ff9c3a');rect(q.x+5,q.y-18,10,6,'#ffd28a');rect(q.x+3,q.y-5,5,2,'#ff4a3d')});['ICHIRAKU','КРЫШИ','РЫНОК','ХРАМ','ВЕРХНИЙ МАРШРУТ','НЕОНОВЫЙ МОСТ'].forEach(function(s,i){var x=[150,650,1160,1710,1460,2110][i],y=[310,330,290,270,155,85][i];rect(x,y,90,23,'#0a0e14');ctx.strokeStyle=i===2?'#ff8a1e':'#00f0ff';ctx.strokeRect(x,y,90,23);ctx.fillStyle=ctx.strokeStyle;ctx.font='bold 11px monospace';ctx.fillText(s,x+7,y+15)});enemies.forEach(function(e){if(e.hp<=0)return;drawEnemy(e);});if(boss.active&&!boss.dead)drawBoss();bullets.forEach(function(b){
 // Speed-scaled streaks keep fast shots legible without adding particles or allocations.
 var dx=b.vx||0,dy=b.vy||0,mag=Math.max(1,Math.hypot(dx,dy)),trail=Math.max(5,Math.min(15,mag*.035)),tx=b.x-dx/mag*trail,ty=b.y-dy/mag*trail;
 var hostile=b.owner==='e',core=hostile?'#fff0c9':'#e9fdff';
 ctx.save();ctx.globalAlpha=hostile?.22:.3;ctx.strokeStyle=b.c;ctx.lineWidth=hostile?3.2:3.8;ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(b.x,b.y);ctx.stroke();
 ctx.globalAlpha=.9;ctx.shadowColor=b.c;ctx.shadowBlur=hostile?5:7;ctx.strokeStyle=b.c;ctx.lineWidth=hostile?1.6:2;ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(b.x,b.y);ctx.stroke();
 ctx.shadowBlur=0;ctx.fillStyle=core;ctx.beginPath();ctx.arc(b.x,b.y,hostile?1.25:1.5,0,Math.PI*2);ctx.fill();ctx.restore();
 });fx.forEach(function(f){ctx.globalAlpha=Math.max(0,f.life/f.max);ctx.fillStyle=f.c;ctx.fillRect(Math.round(f.x),Math.round(f.y),2,2);if(f.life/f.max>.55){ctx.globalAlpha*=.35;ctx.fillRect(Math.round(f.x)-1,Math.round(f.y)-1,4,4)}});ctx.globalAlpha=1;if(!p.dead){if(p.inv>0&&Math.floor(p.inv*20)%2===0)ctx.globalAlpha=.35;var ch=selectedCharacter;drawOperator(p._rx===undefined?p.x:p._rx,p._ry===undefined?p.y:p._ry,p.face,ch,p._gaitPhase||0,p.atk,p._rvx===undefined?p.vx:p._rvx,p._rvy===undefined?p.vy:p._rvy,p._hitReact||0,p._landPulse||0);if(p.shield>0||(p._blockPulse||0)>.01){ctx.save();var blockGlow=Math.max(p.shield>0?.32:0,(p._blockPulse||0)*.62);ctx.globalAlpha=blockGlow+.08*Math.sin(performance.now()*.012);ctx.strokeStyle='#55dff3';ctx.lineWidth=2+(p._blockPulse||0)*1.5;ctx.shadowColor='#55dff3';ctx.shadowBlur=8+(p._blockPulse||0)*9;ctx.beginPath();ctx.ellipse(p.x+p.w/2,p.y+p.h/2,p.w*(.82+(p._blockPulse||0)*.1),p.h*(.7+(p._blockPulse||0)*.08),0,0,Math.PI*2);ctx.stroke();ctx.restore()}if((p._landPulse||0)>.02){ctx.save();var land=p._landPulse;ctx.globalAlpha=land*.42;ctx.strokeStyle='#b8e7ff';ctx.lineWidth=1+land;ctx.beginPath();ctx.ellipse(p.x+p.w/2,p.y+p.h-1,p.w*(.65+(.9-land)*.5),2+land*4,0,0,Math.PI*2);ctx.stroke();ctx.restore()}ctx.globalAlpha=1}ctx.restore();drawLightingOverlay()}
// MAIN LOOP: simulation scheduler is independent from rendering and DOM events.
function renderFrame(rdt){
 SparkRenderMath.interpolateActors(enemies,boss,p,rdt,smoothRenderPose);
 draw();
}
// HUB INPUT: pointer/touch-first activation for Telegram Android WebViews.
/* Pointer-first hub input: Android Telegram WebViews may fail to synthesize click after touch. */
function activateHubButton(b){if(b.dataset&&b.dataset.level!==undefined){selectedLevel=Math.max(0,Math.min(3,Number(b.dataset.level)||0));document.querySelectorAll('.mission-card[data-level]').forEach(function(card){card.classList.toggle('selected',card===b)});var names=['ЦЕНТРАЛЬНЫЙ КОМПЛЕКС','КРЫШИ ДЕРЕВНИ','ПРОМЗОНА','СЕКРЕТНАЯ БАЗА'];var homeMission=document.querySelector('#openMissions');if(homeMission){var spans=homeMission.querySelectorAll('b,small');if(spans[0])spans[0].textContent='1-'+(selectedLevel+1)+' · '+names[selectedLevel];if(spans[1])spans[1].textContent=['Город · меха-босс','Крыши · воздушные отряды','Конвейеры · тяжёлые бойцы','Подземная база · элитные враги'][selectedLevel]}return;}
 if(!b||!$('menu').contains(b))return;
 if(b.hasAttribute('data-goto')){showScreen(b.dataset.goto);return}
 if(b.classList.contains('character-card')){
  var idx=Array.prototype.indexOf.call($('characterGrid').children,b);
  if(idx>=0&&CHARACTERS[idx]){selectedCharacter=CHARACTERS[idx];renderCharacterSelector();hud()}
  return;
 }
 if(b.classList.contains('weapon-card')){
  var key=Object.keys(WEAPONS).filter(function(k){return WEAPONS[k].name===b.querySelector('b')?.textContent})[0];
  if(key){selectedWeapon=key;renderWeapons()}return;
 }
 switch(b.id){
  case 'start': p.weapon=selectedWeapon;reset();break;
  case 'openMissions': showScreen('missions');break;
  case 'settingsShortcut': showScreen('settings');break;
  case 'soundToggle': soundEnabled=!soundEnabled;b.classList.toggle('on',soundEnabled);b.textContent=soundEnabled?'ВКЛ':'ВЫКЛ';if(soundEnabled)beep(660,.06);break;
  case 'chooseCharacter': reset();break;
  case 'equipWeapon': p.weapon=selectedWeapon;$('weapon').textContent='▸ '+WEAPONS[p.weapon].name;showScreen('home');toast('ОРУЖИЕ: '+WEAPONS[p.weapon].name);break;
  case 'missionOne': selectedLevel=0;break;
  case 'missionStart': reset();break;
 }
}
/* Touch-first input: Telegram Android WebView may not dispatch pointerup/click consistently
   inside nested portal iframes. Touchend is handled explicitly; synthetic click is suppressed. */
var lastHubTouch=0;
document.addEventListener('touchend',function(e){
 var b=e.target&&e.target.closest?e.target.closest('#menu button'):null;
 if(!b||!$('menu').contains(b))return;
 lastHubTouch=Date.now();e.preventDefault();e.stopPropagation();activateHubButton(b);
}, {capture:true,passive:false});
document.addEventListener('click',function(e){
 var b=e.target&&e.target.closest?e.target.closest('#menu button'):null;
 if(!b||!$('menu').contains(b))return;
 if(Date.now()-lastHubTouch<800){e.preventDefault();e.stopPropagation();return}
 e.preventDefault();e.stopPropagation();activateHubButton(b)
},true);
$('retry').onclick=reset;$('again').onclick=reset;document.addEventListener('visibilitychange',function(){SparkSimulation.resetClock();last=0;acc=0;if(document.hidden)resetInput()});resize();resetInput();renderCharacterSelector();renderWeapons();showScreen('home');SparkSimulation.start(update,renderFrame);
})();
