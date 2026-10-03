/* FREEzzz MAFIA — vertical 2D platformer foundation.
 * Three original visual characters from the locked Arena graphics.
 * Four fictional families. Three-floor missions. Enemy archetypes, career,
 * weapons, armor, money, shop and mission progression.
 *
 * The setting is fictionalized: no real criminal organization is represented.
 */

type FighterId="vex"|"ruma"|"korr";
type Phase="select"|"fight"|"result";
type Pose="idle"|"move"|"guard"|"burst"|"hit"|"victory";
type Fighter={
  id:FighterId; name:string; tag:string; speed:number; power:number; guard:number;
  accent:string; skin:string; skinHi:string; skinShadow:string; gear:string; gearHi:string;
  build:number; head:number; burstName:string; burstColor:string;
};
const W=640,H=448;
const fighters:Record<FighterId,Fighter>={
  vex:{id:"vex",name:"VEX",tag:"URBAN RUNNER",speed:8,power:5,guard:4,accent:"#54d6d8",skin:"#a96858",skinHi:"#d18b70",skinShadow:"#6e4038",gear:"#182027",gearHi:"#36444b",build:0,head:0,burstName:"RUSH",burstColor:"#7ff7f7"},
  ruma:{id:"ruma",name:"RUMA",tag:"DESERT GUARDIAN",speed:5,power:8,guard:7,accent:"#c58b48",skin:"#996149",skinHi:"#c98563",skinShadow:"#5f3b31",gear:"#57422f",gearHi:"#866644",build:1,head:1,burstName:"GUARDIAN",burstColor:"#f0bd73"},
  korr:{id:"korr",name:"KORR",tag:"INDUSTRIAL HEAVY",speed:3,power:9,guard:9,accent:"#d86c35",skin:"#705047",skinHi:"#9b6d59",skinShadow:"#402f2b",gear:"#30383d",gearHi:"#59636a",build:2,head:2,burstName:"OVERDRIVE",burstColor:"#ff995f"}
};
const palette=["#07090b","#0e1215","#171d21","#242d32","#38434a","#59656b","#7d898d","#aab1b4","#d5d8d7","#f0eee7"];
type Input={left:boolean;right:boolean;guard:boolean;burst:boolean;};
const input:Input={left:false,right:false,guard:false,burst:false};

function clamp(v:number,a:number,b:number){return Math.max(a,Math.min(b,v));}
function shade(hex:string,n:number){const x=hex.replace("#","");const r=parseInt(x.slice(0,2),16),g=parseInt(x.slice(2,4),16),b=parseInt(x.slice(4,6),16);const f=clamp(n,0,1);return "rgb("+Math.round(r*f)+","+Math.round(g*f)+","+Math.round(b*f)+")";}
function rect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,c:string){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function ellipse(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,c:string,rot=0){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2);ctx.fill();}
function limb(ctx:CanvasRenderingContext2D,x1:number,y1:number,x2:number,y2:number,w:number,c:string){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function poly(ctx:CanvasRenderingContext2D,pts:number[],c:string){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)ctx.lineTo(pts[i],pts[i+1]);ctx.closePath();ctx.fill();}
function text(ctx:CanvasRenderingContext2D,s:string,x:number,y:number,size=8,c="#d5d8d7",align:CanvasTextAlign="left"){ctx.font="700 "+size+"px monospace";ctx.textAlign=align;ctx.textBaseline="top";ctx.fillStyle=c;ctx.fillText(s,x,y);}
function pixel(ctx:CanvasRenderingContext2D,x:number,y:number,c:string){rect(ctx,x,y,1,1,c);}
function seedFor(id:FighterId){return id==="vex"?17:id==="ruma"?31:53;}
function noise(ctx:CanvasRenderingContext2D,id:FighterId,x:number,y:number,w:number,h:number,base:string,seed:number,density=.12){
  let n=seed>>>0;
  for(let yy=0;yy<h;yy+=2)for(let xx=0;xx<w;xx+=2){n=(n*1664525+1013904223)>>>0;if(((n&255)/255)<density)pixel(ctx,x+xx,y+yy,shade(base,.62+((n>>>8)%30)/100));}
}

/* Detailed stepped silhouettes. The geometry is deliberately authored as a sprite,
   not a generic stick figure: shoulders, waist, hands, boots, face planes and material
   highlights are all separate pixel clusters. */
function poseFor(f:Fighter,frame:number,pose:Pose){
  const q=(frame%32)/32,step=q<.5?1:-1,breathe=Math.sin(q*Math.PI*2)*.7;
  if(pose==="guard")return {bob:-1,lean:f.id==="korr"?-1:-2,frontArm:-10,backArm:5,frontLeg:-5,backLeg:7,stance:7};
  if(pose==="burst")return {bob:-3,lean:f.id==="vex"?5:f.id==="ruma"?2:-1,frontArm:-18,backArm:8,frontLeg:-8,backLeg:11,stance:10};
  if(pose==="hit")return {bob:2,lean:-6,frontArm:9,backArm:-7,frontLeg:8,backLeg:-7,stance:5};
  if(pose==="victory")return {bob:-3,lean:-1,frontArm:-18,backArm:-14,frontLeg:-2,backLeg:3,stance:5};
  if(pose==="move")return {bob:breathe-2,lean:step*3,frontArm:step*-7,backArm:step*7,frontLeg:step*9,backLeg:step*-8,stance:8};
  return {bob:breathe,lean:0,frontArm:step*-2,backArm:step*2,frontLeg:step*2,backLeg:step*-2,stance:4};
}

/* Authored combat sprite: each pose changes the silhouette, limb angles and weight distribution. */
function drawSprite(ctx:CanvasRenderingContext2D,f:Fighter,cx:number,ground:number,frame:number,flip=false,ghost=false,scale=1,pose:Pose="idle"){
  const p=poseFor(f,frame,pose),d=flip?-1:1;
  ctx.save();ctx.translate(cx,ground+p.bob);ctx.scale(d*scale,scale);
  if(ghost)ctx.globalAlpha=.17;

  const skin=f.skin,hi=f.skinHi,shadow=f.skinShadow,cloth=f.gear,clothHi=f.gearHi,a=f.accent;
  const lean=p.lean,shoulder=f.build===2?23:f.build===1?21:19;

  ellipse(ctx,0,0,28,3,"rgba(0,0,0,.72)");

  // Back leg.
  limb(ctx,6+lean,-46,10+p.backLeg,-9,11,shade(cloth,.66));
  limb(ctx,10+p.backLeg,-10,18+p.backLeg,-2,7,"#090c0e");
  rect(ctx,14+p.backLeg,-4,11,3,shade(clothHi,.55));

  // Front leg and knee plane.
  limb(ctx,-5+lean,-46,-8+p.frontLeg,-27,12,cloth);
  limb(ctx,-8+p.frontLeg,-27,-13+p.frontLeg,-8,10,cloth);
  ellipse(ctx,-8+p.frontLeg,-27,6,7,shade(clothHi,.70),.15);
  limb(ctx,-13+p.frontLeg,-8,-19+p.frontLeg,-2,7,"#090c0e");
  rect(ctx,-22+p.frontLeg,-4,11,3,shade(clothHi,.55));

  // Pelvis / waist.
  poly(ctx,[-14+lean,-57,-9+lean,-47,0+lean,-44,10+lean,-47,14+lean,-57,8+lean,-62,-7+lean,-62],cloth);
  rect(ctx,-11+lean,-51,22,3,clothHi);rect(ctx,-7+lean,-47,14,2,shade(cloth,.55));

  // Torso with asymmetric shoulders.
  poly(ctx,[-shoulder+lean,-84,-12+lean,-86,-7+lean,-61,0+lean,-54,9+lean,-61,shoulder+lean,-83,12+lean,-91,-10+lean,-91],cloth);
  poly(ctx,[-shoulder+lean+2,-81,-8+lean,-84,0+lean,-76,8+lean,-84,shoulder+lean-2,-80,11+lean,-65,0+lean,-59,-11+lean,-65],clothHi);
  poly(ctx,[-8+lean,-63,0+lean,-58,8+lean,-63,6+lean,-50,-6+lean,-50],shade(cloth,.54));

  if(f.id==="vex"){
    rect(ctx,-19+lean,-82,7,27,a);rect(ctx,12+lean,-82,7,27,a);
    rect(ctx,-6+lean,-79,12,22,"#080e12");rect(ctx,-16+lean,-61,5,10,shade(a,.72));rect(ctx,11+lean,-61,5,10,shade(a,.72));
    rect(ctx,-12+lean,-49,8,3,a);rect(ctx,5+lean,-49,8,3,a);
  }else if(f.id==="ruma"){
    rect(ctx,-18+lean,-82,36,8,a);rect(ctx,-14+lean,-69,28,7,clothHi);rect(ctx,-11+lean,-58,22,4,shade(a,.72));rect(ctx,-8+lean,-52,16,3,cloth);
  }else{
    rect(ctx,-22+lean,-84,44,11,a);rect(ctx,-16+lean,-70,32,8,clothHi);rect(ctx,-12+lean,-59,24,7,"#12181c");
    rect(ctx,-20+lean,-49,10,3,a);rect(ctx,10+lean,-49,10,3,a);
  }

  // Rear arm.
  const rearX=shoulder+lean,rearElbow=shoulder+7+p.backArm;
  limb(ctx,rearX,-78,rearElbow,-61,10,cloth);limb(ctx,rearElbow,-61,rearElbow+2,-43,8,cloth);ellipse(ctx,rearElbow+2,-39,5,7,skin,.1);

  // Front arm changes dramatically between idle, guard and burst.
  const fx=-shoulder+lean,felbow=-shoulder-7+p.frontArm,fhandY=pose==="burst"?-73:pose==="guard"?-55:-40;
  limb(ctx,fx,-78,felbow,-62,11,cloth);
  limb(ctx,felbow,-62,pose==="burst"?-shoulder-19:felbow-2,fhandY,8,cloth);
  ellipse(ctx,(pose==="burst"?-shoulder-19:felbow-2),fhandY+4,5,7,skin,.15);

  // Neck and three-plane head.
  rect(ctx,-7+lean,-97,14,13,shadow);
  poly(ctx,[-12+lean,-116,-6+lean,-120,6+lean,-119,13+lean,-112,14+lean,-98,9+lean,-83,0+lean,-77,-9+lean,-83,-14+lean,-98,-14+lean,-111],skin);
  poly(ctx,[-11+lean,-113,-5+lean,-117,4+lean,-116,10+lean,-110,8+lean,-101,-1+lean,-104,-9+lean,-101],hi);
  poly(ctx,[-14+lean,-100,-8+lean,-94,-3+lean,-87,0+lean,-79,-9+lean,-83,-14+lean,-98],shadow);

  if(f.id==="vex"){
    poly(ctx,[-14+lean,-108,-10+lean,-118,0+lean,-120,12+lean,-114,15+lean,-106,7+lean,-105,1+lean,-110,-5+lean,-106,-10+lean,-110],"#0c1318");
    rect(ctx,9+lean,-106,5,2,a);rect(ctx,-14+lean,-106,5,2,a);
  }else if(f.id==="ruma"){
    poly(ctx,[-16+lean,-108,-10+lean,-117,0+lean,-120,10+lean,-116,16+lean,-108,12+lean,-101,-12+lean,-101],"#65402e");
    rect(ctx,-16+lean,-106,32,6,a);
  }else{
    rect(ctx,-15+lean,-116,30,10,"#0c1318");rect(ctx,-19+lean,-110,6,14,a);rect(ctx,13+lean,-110,6,14,a);
  }

  rect(ctx,-9+lean,-101,7,3,shadow);rect(ctx,2+lean,-101,7,3,shadow);
  rect(ctx,-7+lean,-99,3,2,"#f0eee7");rect(ctx,4+lean,-99,3,2,"#f0eee7");
  rect(ctx,-2+lean,-96,4,7,shadow);rect(ctx,-6+lean,-87,12,2,hi);rect(ctx,-5+lean,-84,10,2,shadow);
  if(f.id==="korr")rect(ctx,-10+lean,-93,20,4,clothHi);
  if(f.id==="ruma")rect(ctx,-11+lean,-86,22,2,shade(a,.86));

  // Pixel material clusters.
  for(let i=0;i<8;i++){const yy=-74+(i%4)*7,xx=-11+((i*7)%19);rect(ctx,xx+lean,yy,2,2,i%3===0?hi:shade(clothHi,.72));}
  rect(ctx,-shoulder+4+lean,-70,2,12,shade(a,.62));

  if(pose==="guard"){rect(ctx,-22+lean,-57,9,3,a);rect(ctx,13+lean,-55,9,3,a);}
  if(pose==="burst"){rect(ctx,-31,-77,5,2,f.burstColor);rect(ctx,-37,-73,3,2,f.burstColor);rect(ctx,-43,-69,2,2,f.burstColor);}
  if(pose==="hit"){rect(ctx,15+lean,-93,4,2,"#f0eee7");rect(ctx,19+lean,-90,3,2,"#7e898d");}
  ctx.restore();
}

type FamilyId="valenti"|"moretti"|"rossi"|"bellini";
type EnemyType="brawler"|"shooter"|"heavy"|"rusher"|"guard"|"sniper"|"suppressor"|"flanker";
type WeaponId="pocket"|"service"|"revolver"|"smg"|"shotgun"|"carbine";
type GameMode="select"|"mission"|"shop"|"result";
type MissionState="briefing"|"play"|"complete";
type Family={id:FamilyId;name:string;accent:string;desc:string;bonus:string;};
type Weapon={id:WeaponId;name:string;damage:number;rate:number;range:number;mag:number;cost:number;rank:number;skill:number;spread:number;};
type Armor={name:string;hp:number;cost:number;rank:number;};
type Enemy={type:EnemyType;name:string;hp:number;speed:number;damage:number;range:number;cooldown:number;reward:number;};
type PlayerState={family:FamilyId;fighter:FighterId;rank:number;xp:number;money:number;hp:number;armor:number;weapon:WeaponId;skill:number;floor:number;x:number;y:number;vy:number;shots:number;};

const families:Record<FamilyId,Family>={
  valenti:{id:"valenti",name:"VALENTI",accent:"#54d6d8",desc:"Fast operators and couriers.",bonus:"+speed / +pistol skill"},
  moretti:{id:"moretti",name:"MORETTI",accent:"#c58b48",desc:"Disciplined street veterans.",bonus:"+health / +revolver skill"},
  rossi:{id:"rossi",name:"ROSSI",accent:"#d86c35",desc:"Heavy hitters with strong defenses.",bonus:"+armor / +shotgun skill"},
  bellini:{id:"bellini",name:"BELLINI",accent:"#9f83d6",desc:"Technical specialists and marksmen.",bonus:"+accuracy / +rifle skill"}
};

const weapons:Record<WeaponId,Weapon>={
  pocket:{id:"pocket",name:"POCKET 9",damage:7,rate:.28,range:125,mag:8,cost:0,rank:1,skill:0,spread:1},
  service:{id:"service",name:"SERVICE",damage:10,rate:.32,range:145,mag:10,cost:350,rank:2,skill:1,spread:1},
  revolver:{id:"revolver",name:"REVOLVER",damage:16,rate:.55,range:155,mag:6,cost:650,rank:3,skill:2,spread:.5},
  smg:{id:"smg",name:"SMG",damage:6,rate:.12,range:135,mag:24,cost:1100,rank:4,skill:3,spread:3},
  shotgun:{id:"shotgun",name:"SHOTGUN",damage:25,rate:.75,range:95,mag:5,cost:1450,rank:5,skill:4,spread:8},
  carbine:{id:"carbine",name:"CARBINE",damage:21,rate:.42,range:190,mag:12,cost:2200,rank:6,skill:5,spread:1}
};

const armors:Armor[]=[
  {name:"LIGHT VEST",hp:20,cost:500,rank:2},
  {name:"STREET VEST",hp:40,cost:1000,rank:4},
  {name:"HEAVY VEST",hp:70,cost:1800,rank:6}
];

const enemyCatalog:Record<EnemyType,Enemy>={
  brawler:{type:"brawler",name:"BRAWLER",hp:34,speed:36,damage:9,range:24,cooldown:1.0,reward:12},
  shooter:{type:"shooter",name:"SHOOTER",hp:28,speed:18,damage:7,range:120,cooldown:1.25,reward:18},
  heavy:{type:"heavy",name:"HEAVY",hp:85,speed:14,damage:15,range:28,cooldown:1.45,reward:30},
  rusher:{type:"rusher",name:"RUSHER",hp:25,speed:62,damage:11,range:22,cooldown:1.1,reward:20},
  guard:{type:"guard",name:"GUARD",hp:48,speed:12,damage:10,range:110,cooldown:1.0,reward:24},
  sniper:{type:"sniper",name:"SNIPER",hp:24,speed:5,damage:32,range:260,cooldown:4.2,reward:45},
  suppressor:{type:"suppressor",name:"SUPPRESSOR",hp:42,speed:8,damage:4,range:180,cooldown:.35,reward:35},
  flanker:{type:"flanker",name:"FLANKER",hp:30,speed:48,damage:8,range:25,cooldown:.85,reward:25}
};

type Mob={enemy:EnemyType;x:number;y:number;hp:number;cooldown:number;dir:number;shotFlash:number;};
type Bullet={x:number;y:number;vx:number;damage:number;enemy:boolean;life:number;};

const floorNames=["STREET","BACK ROOMS","ROOFTOP"];
const W2=640,H2=448;
const platformY=[352,250,148];
const input2={left:false,right:false,up:false,down:false,fire:false};
let familySelected:FamilyId="valenti";

function moneyText(n:number){return "$"+Math.max(0,Math.floor(n)).toLocaleString("en-US");}
function rankName(rank:number){return ["RECRUIT","RUNNER","SOLDIER","OPERATOR","CAPO","UNDERBOSS"][Math.min(5,rank-1)]||"RECRUIT";}
function xpForRank(rank:number){return 100+rank*80;}

function drawBackground(ctx:CanvasRenderingContext2D,t:number,floor:number){
  ctx.fillStyle="#050708";ctx.fillRect(0,0,W2,H2);
  const sky=ctx.createLinearGradient(0,0,0,H2);sky.addColorStop(0,"#06080b");sky.addColorStop(1,"#20282c");ctx.fillStyle=sky;ctx.fillRect(0,0,W2,H2);
  // Keep the locked industrial pixel language, but stage it as a platformer.
  for(let x=0;x<W2;x+=32){rect(ctx,x,58,2,250,"#151d21");if(x%64===0)rect(ctx,x+5,80,21,2,"#2d383d");}
  for(let y=70;y<310;y+=22)rect(ctx,0,y,W2,1,"#11191d");
  for(let i=0;i<10;i++){const x=(i*71+t*.008)%W2;rect(ctx,x,46+(i%4)*18,3,2,"#6b777c");}
  const py=platformY[floor];
  rect(ctx,0,py+8,W2,H2-py-8,"#080b0d");
  rect(ctx,0,py,W2,3,"#687479");
  rect(ctx,0,py+4,W2,2,"#182126");
  for(let x=0;x<W2;x+=24){rect(ctx,x,py+7,1,H2-py-7,"#131b1f");}
  // background architecture differs by floor.
  if(floor===0){for(let x=24;x<620;x+=80){rect(ctx,x,py-95,46,95,"#0d1317");rect(ctx,x+7,py-78,30,42,"#182126");}}
  if(floor===1){for(let x=18;x<620;x+=92){rect(ctx,x,py-135,4,135,"#39464c");rect(ctx,x+12,py-115,52,3,"#202b30");}}
  if(floor===2){rect(ctx,0,py-70,W2,4,"#39464c");for(let x=12;x<620;x+=58){rect(ctx,x,py-66,2,66,"#1b2429");}}
  text(ctx,"FREEzzz CITY",8,42,6,"#727e82");
  text(ctx,floorNames[floor]+" / 03",312,42,6,"#a0aaad","right");
}

type MafiaMember={name:string;face:string;tie:string;family:FamilyId;fighter:FighterId;};
const mafiaMembers:Record<FamilyId,MafiaMember>={
  valenti:{name:"VITO",face:"#8f5d4d",tie:"#54d6d8",family:"valenti",fighter:"vex"},
  moretti:{name:"MARCO",face:"#b87558",tie:"#c58b48",family:"moretti",fighter:"ruma"},
  rossi:{name:"LUCA",face:"#754b40",tie:"#d86c35",family:"rossi",fighter:"korr"},
  bellini:{name:"ENZO",face:"#a86b55",tie:"#9f83d6",family:"bellini",fighter:"vex"}
};

function drawMafiaMember(ctx:CanvasRenderingContext2D,m:MafiaMember,cx:number,ground:number,frame:number,scale=1){
  ctx.save();ctx.translate(cx,ground);ctx.scale(scale,scale);
  ellipse(ctx,0,0,24,3,"rgba(0,0,0,.72)");
  // Classic dark suit, white shirt and tie.
  limb(ctx,6,-43,10,-9,11,"#181b1e");
  limb(ctx,-6,-43,-10,-9,11,"#181b1e");
  rect(ctx,5,-10,12,3,"#080a0c");rect(ctx,-17,-10,12,3,"#080a0c");
  poly(ctx,[-19,-83,-12,-89,-5,-56,0,-50,5,-56,12,-89,19,-83,12,-51,0,-45,-12,-51],"#1b1e22");
  poly(ctx,[-9,-82,0,-68,9,-82,6,-51,0,-46,-6,-51],"#f0eee7");
  poly(ctx,[-7,-78,0,-68,7,-78,4,-52,-4,-52],"#d5d8d7");
  rect(ctx,-2,-68,4,19,m.tie);
  rect(ctx,-9,-56,18,3,"#0e1114");
  limb(ctx,-19,-76,-28,-48,8,"#1b1e22");limb(ctx,19,-76,28,-48,8,"#1b1e22");
  ellipse(ctx,-29,-44,5,6,m.face);
  ellipse(ctx,29,-44,5,6,m.face);
  rect(ctx,-7,-98,14,14,m.face);
  ellipse(ctx,0,-105,12,13,m.face);
  // Fedora.
  rect(ctx,-16,-117,32,5,"#111417");
  rect(ctx,-11,-124,22,8,"#171b1f");
  rect(ctx,-18,-119,36,3,"#080a0c");
  // Face planes, kept deliberately simple and pixel-art readable.
  rect(ctx,-9,-107,18,3,"#c98563");
  rect(ctx,-8,-100,4,2,"#171b1f");rect(ctx,4,-100,4,2,"#171b1f");
  rect(ctx,-3,-96,6,2,"#6b4038");
  rect(ctx,-6,-92,12,2,"#d5a08b");
  // Suit lapels and pocket square.
  poly(ctx,[-10,-82,-2,-68,-7,-62,-14,-80],"#30353a");
  poly(ctx,[10,-82,2,-68,7,-62,14,-80],"#30353a");
  rect(ctx,10,-72,5,4,m.tie);
  // Tiny material highlights.
  rect(ctx,-14,-77,2,12,"#596166");rect(ctx,12,-77,2,12,"#596166");
  rect(ctx,-2,-50,4,2,m.tie);
  ctx.restore();
}

function drawPlatformPlayer(ctx:CanvasRenderingContext2D,f:Fighter,p:PlayerState,frame:number){
  const pose:Pose=input2.fire?"burst":input2.left||input2.right?"move":"idle";
  drawSprite(ctx,f,p.x,p.y,frame,false,false,1.02,pose);
  if(input2.fire){rect(ctx,p.x+22,p.y-76,12,3,f.accent);}
}

function drawMob(ctx:CanvasRenderingContext2D,m:Mob,frame:number){
  const e=enemyCatalog[m.enemy];
  const fake:Fighter=m.enemy==="heavy"||m.enemy==="guard"?fighters.korr:m.enemy==="sniper"?fighters.ruma:fighters.vex;
  const pose:Pose=m.shotFlash>0?"burst":m.enemy==="brawler"||m.enemy==="rusher"||m.enemy==="flanker"?"move":"guard";
  ctx.save();ctx.globalAlpha=.9;drawSprite(ctx,fake,m.x,m.y,frame+7,m.dir<0,false,.72,pose);ctx.restore();
  const w=m.enemy==="heavy"?38:30;
  rect(ctx,m.x-w/2,m.y-137,w,4,"#07090b");
  rect(ctx,m.x-w/2,m.y-137,w*clamp(m.hp/e.hp,0,1),4,"#b9c0c2");
  text(ctx,e.name,m.x,m.y-149,4,"#9aa4a7","center");
}

function drawHUD2(ctx:CanvasRenderingContext2D,p:PlayerState,mission:number){
  rect(ctx,0,0,W2,35,"#050708");
  text(ctx,rankName(p.rank),8,5,8,"#f0eee7");text(ctx,p.family.toUpperCase(),8,18,5,families[p.family].accent);
  text(ctx,moneyText(p.money),312,5,8,"#f0eee7","right");text(ctx,"R"+p.rank+"  "+p.xp+"/"+xpForRank(p.rank)+" XP",312,18,5,"#8f9a9e","right");
  rect(ctx,126,6,72,7,"#1a2226");rect(ctx,127,7,70*clamp(p.hp/100,0,1),5,families[p.family].accent);
  text(ctx,"HP",116,6,4,"#8f9a9e","right");
  text(ctx,weapons[p.weapon].name,8,37,5,"#d5d8d7");
  text(ctx,"MISSION "+mission+" · "+floorNames[p.floor],160,37,5,"#7e898d","center");
  text(ctx,"ARMOR "+Math.max(0,p.armor),312,37,5,"#7e898d","right");
}

function spawnMobs(floor:number):Mob[]{
  const sets:EnemyType[][]=[
    ["brawler","shooter","rusher","brawler"],
    ["shooter","heavy","flanker","guard","rusher"],
    ["sniper","suppressor","heavy","flanker","guard","shooter"]
  ];
  return sets[floor].map((type,i)=>({enemy:type,x:110+i*92,y:platformY[floor],hp:enemyCatalog[type].hp,cooldown:.7+i*.35,dir:i%2? -1:1,shotFlash:0}));
}

export function mountFreezzzMafia(host:HTMLElement):()=>void{
  host.innerHTML="";
  const root=document.createElement("section");root.className="freezzz-mafia";
  root.innerHTML='<div class="freezzz-mafia-screen"><canvas width="'+W2+'" height="'+H2+'" aria-label="FREEzzz Mafia platformer"></canvas><div class="freezzz-mafia-scanlines"></div></div><div class="freezzz-mafia-controls"><button data-mafia="left">◀</button><button data-mafia="right">▶</button><button data-mafia="up">JUMP</button><button data-mafia="fire">FIRE</button><button data-mafia="shop">SHOP</button></div>';
  host.append(root);
  const style=document.createElement("style");style.textContent='.freezzz-mafia{width:100%;background:#050708;border:1px solid #252c30;padding:0;display:flex;flex-direction:column;align-items:center;gap:8px}.freezzz-mafia-screen{width:100%;aspect-ratio:640/448;position:relative;overflow:hidden}.freezzz-mafia-screen canvas{width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges}.freezzz-mafia-scanlines{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(to bottom,transparent 0,transparent 2px,rgba(0,0,0,.14) 3px)}.freezzz-mafia-controls{width:100%;display:flex;gap:5px;justify-content:center;flex-wrap:wrap}.freezzz-mafia-controls button{min-width:62px;height:40px;border:1px solid #343d42;border-radius:0;background:#0b0f12;color:#d5d8d7;font:700 10px monospace;touch-action:none}.freezzz-mafia-controls button:active{background:#1b2328;border-color:#7e898d}@media(max-width:700px){.freezzz-mafia-controls button{min-width:58px;height:44px}}';root.append(style);
  const canvas=root.querySelector<HTMLCanvasElement>("canvas")!;const ctx=canvas.getContext("2d",{alpha:false})!;ctx.imageSmoothingEnabled=false;

  let mode:GameMode="select",missionState:MissionState="briefing",frame=0,last=performance.now(),raf=0;
  let mission=1,mobs:Mob[]=[],bullets:Bullet[]=[],floorClear=false,fireCooldown=0,missionTimer=0,notice="",noticeTimer=0;
  let player:PlayerState={family:"valenti",fighter:"vex",rank:1,xp:0,money:150,hp:100,armor:0,weapon:"pocket",skill:0,floor:0,x:80,y:platformY[0],vy:0,shots:0};

  function configureFamily(id:FamilyId){
    familySelected=id;
    const map:Record<FamilyId,FighterId>={valenti:"vex",moretti:"ruma",rossi:"korr",bellini:"vex"};
    player.family=id;player.fighter=map[id];player.rank=1;player.xp=0;player.money=150;player.hp=100;player.armor=0;player.weapon="pocket";player.skill=0;player.floor=0;player.x=80;player.y=platformY[0];player.vy=0;
  }
  function startMission(){missionState="briefing";mode="mission";player.floor=0;player.x=70;player.y=platformY[0];player.hp=Math.min(100,player.hp+20);mobs=spawnMobs(0);bullets=[];missionTimer=0;floorClear=false;notice="MISSION "+mission+" · "+floorNames[0];noticeTimer=2;}
  function beginPlay(){missionState="play";missionTimer=0;}
  function completeMission(){
    missionState="complete";mode="result";
    const reward=500+mission*250;
    player.money+=reward;player.xp+=120+mission*40;
    while(player.xp>=xpForRank(player.rank)&&player.rank<6){player.xp-=xpForRank(player.rank);player.rank++;notice="PROMOTED · "+rankName(player.rank);noticeTimer=2.2;}
    notice="MISSION COMPLETE  +"+moneyText(reward);noticeTimer=3;
  }
  function openShop(){mode="shop";}
  function buyWeapon(id:WeaponId){
    const w=weapons[id];if(player.rank<w.rank||player.skill<w.skill||player.money<w.cost)return;
    player.money-=w.cost;player.weapon=id;notice="EQUIPPED · "+w.name;noticeTimer=1.5;
  }
  function buyArmor(a:Armor){
    if(player.rank<a.rank||player.money<a.cost)return;
    player.money-=a.cost;player.armor=a.hp;player.hp=Math.min(100+Math.floor(a.hp*.25),player.hp+25);notice="EQUIPPED · "+a.name;noticeTimer=1.5;
  }
  function shoot(){
    const w=weapons[player.weapon];if(fireCooldown>0)return;
    fireCooldown=w.rate;player.shots++;
    const dir=input2.left?-1:1;
    bullets.push({x:player.x+dir*24,y:player.y-78,vx:dir*(190+w.range*.15),damage:w.damage*(1+player.skill*.06),enemy:false,life:w.range/1000});
  }
  function hurtPlayer(d:number){
    const absorb=Math.min(player.armor,d*.55);player.armor-=absorb;const left=d-absorb;player.hp-=left;
    if(player.hp<=0){player.hp=100;player.money=Math.max(0,player.money-100);startMission();}
  }
  function updateMobs(dt:number){
    for(const m of mobs){
      const e=enemyCatalog[m.enemy];m.cooldown=Math.max(0,m.cooldown-dt);m.shotFlash=Math.max(0,m.shotFlash-dt);
      const dx=player.x-m.x,dist=Math.abs(dx);m.dir=dx<0?-1:1;
      if(m.enemy==="brawler"||m.enemy==="rusher"||m.enemy==="flanker"){
        const speed=e.speed*(m.enemy==="flanker"?1.15:1);
        if(dist>e.range)m.x+=Math.sign(dx)*speed*dt;
        if(m.enemy==="flanker"&&dist>60)m.x+=Math.sin(frame*.03+m.x)*18*dt;
      }else if(m.enemy==="sniper"){
        if(dist<160)m.x-=Math.sign(dx)*e.speed*dt;
      }else if(m.enemy==="shooter"||m.enemy==="guard"||m.enemy==="suppressor"){
        if(dist<e.range*.55)m.x-=Math.sign(dx)*e.speed*dt;
        else if(dist>e.range*.8)m.x+=Math.sign(dx)*e.speed*dt;
      }else if(m.enemy==="heavy"&&dist>e.range)m.x+=Math.sign(dx)*e.speed*dt;
      m.x=clamp(m.x,30,610);
      if(m.cooldown<=0&&dist<=e.range){
        m.cooldown=e.cooldown;m.shotFlash=.12;
        if(m.enemy==="sniper"){
          if(dist>70)bullets.push({x:m.x,y:m.y-82,vx:Math.sign(dx)*280,damage:e.damage,enemy:true,life:.95});
        }else if(e.range>40){
          bullets.push({x:m.x,y:m.y-78,vx:Math.sign(dx)*120,damage:e.damage,enemy:true,life:1.1});
        }else hurtPlayer(e.damage);
      }
    }
  }
  function updateBullets(dt:number){
    bullets=bullets.filter(b=>{
      b.x+=b.vx*dt;b.life-=dt;if(b.life<=0||b.x<0||b.x>W2)return false;
      if(!b.enemy){
        for(const m of mobs){if(Math.abs(b.x-m.x)<18&&Math.abs(b.y-(m.y-72))<55){m.hp-=b.damage;b.life=0;break;}}
      }else if(Math.abs(b.x-player.x)<20&&Math.abs(b.y-(player.y-72))<52){hurtPlayer(b.damage);return false;}
      return b.life>0;
    });
  }
  function update(dt:number){
    frame++;fireCooldown=Math.max(0,fireCooldown-dt);noticeTimer=Math.max(0,noticeTimer-dt);
    if(mode!=="mission"||missionState!=="play")return;
    if(input2.left)player.x-=70*dt;if(input2.right)player.x+=70*dt;player.x=clamp(player.x,25,615);
    if(input2.up&&player.y>=platformY[player.floor]){player.vy=-185;input2.up=false;}
    player.vy+=460*dt;player.y+=player.vy*dt;
    const ground=platformY[player.floor];if(player.y>ground){player.y=ground;player.vy=0;}
    if(input2.fire)shoot();
    updateMobs(dt);updateBullets(dt);
    mobs=mobs.filter(m=>{
      if(m.hp>0)return true;
      player.money+=enemyCatalog[m.enemy].reward;player.xp+=12+Math.round(enemyCatalog[m.enemy].reward/3);
      return false;
    });
    if(!mobs.length&&!floorClear){
      floorClear=true;
      if(player.floor<2){
        player.floor++;player.x=55;player.y=platformY[player.floor];mobs=spawnMobs(player.floor);floorClear=false;notice="FLOOR "+(player.floor+1)+" · "+floorNames[player.floor];noticeTimer=2;
      }else completeMission();
    }
  }

  function render(t:number){
    const dt=Math.min(.04,(t-last)/1000);last=t;update(dt);
    ctx.clearRect(0,0,W2,H2);
    if(mode==="select"){
      ctx.fillStyle="#050708";ctx.fillRect(0,0,W2,H2);text(ctx,"FOUR FAMILIES",320,26,16,"#f0eee7","center");text(ctx,"CHOOSE YOUR NEW MEMBER",320,49,7,"#7e898d","center");
      const ids:FamilyId[]=["valenti","moretti","rossi","bellini"];
      ids.forEach((id,i)=>{
        const x=80+i*160,a=id===familySelected,m=mafiaMembers[id];
        rect(ctx,x-68,82,136,190,a?"#151d21":"#0b1013");
        rect(ctx,x-68,82,136,3,a?families[id].accent:"#263137");
        text(ctx,families[id].name,x,95,10,a?"#f0eee7":"#aeb5b7","center");
        text(ctx,m.name,x,113,7,families[id].accent,"center");
        drawMafiaMember(ctx,m,x,225,frame+i*4,.72);
        text(ctx,families[id].bonus,x,250,5,families[id].accent,"center");
      });
      text(ctx,"◀ ▶ SELECT    ENTER START",320,300,7,"#d5d8d7","center");text(ctx,"CLASSIC SUITS · FEDORAS · FOUR FAMILY MEMBERS · 3 FLOORS",320,320,5,"#58646a","center");
    }else if(mode==="shop"){
      ctx.fillStyle="#07090b";ctx.fillRect(0,0,W2,H2);text(ctx,"ARMORY & OUTFITTER",320,22,14,"#f0eee7","center");text(ctx,moneyText(player.money),320,43,8,"#d5d8d7","center");
      const ids:WeaponId[]=["pocket","service","revolver","smg","shotgun","carbine"];ids.forEach((id,i)=>{const w=weapons[id],x=58+(i%3)*210,y=72+Math.floor(i/3)*82,ok=player.rank>=w.rank&&player.skill>=w.skill;rect(ctx,x-88,y,176,66,ok?"#10171b":"#090d10");text(ctx,w.name,x-78,y+8,7,ok?"#f0eee7":"#626c70");text(ctx,"DMG "+w.damage+"  MAG "+w.mag,x-78,y+23,5,"#8d989c");text(ctx,w.cost?moneyText(w.cost):"STARTER",x+78,y+23,5,w.cost?"#d5d8d7":"#687277","right");text(ctx,"R"+w.rank+"  SK"+w.skill,x-78,y+40,5,families[player.family].accent);if(player.weapon===id)text(ctx,"EQUIPPED",x+78,y+40,5,"#d5d8d7","right");});
      armors.forEach((a,i)=>{const x=100+i*220;const y=245;rect(ctx,x-90,y,180,55,"#10171b");text(ctx,a.name,x-78,y+8,7,"#f0eee7");text(ctx,"HP +"+a.hp,x-78,y+24,5,"#8d989c");text(ctx,moneyText(a.cost),x+78,y+24,5,"#d5d8d7","right");});
      text(ctx,"1-6 WEAPONS   7-9 ARMOR   ENTER BUY   ESC BACK",320,320,6,"#7e898d","center");
    }else if(mode==="result"){
      ctx.fillStyle="#07090b";ctx.fillRect(0,0,W2,H2);text(ctx,"MISSION COMPLETE",320,68,16,"#f0eee7","center");text(ctx,"+"+moneyText(500+mission*250),320,104,12,"#d5d8d7","center");text(ctx,"RANK "+rankName(player.rank),320,130,9,families[player.family].accent,"center");text(ctx,"ENTER NEXT MISSION   S SHOP",320,186,7,"#7e898d","center");
    }else{
      drawBackground(ctx,t,player.floor);drawHUD2(ctx,player,mission);
      for(const b of bullets)rect(ctx,b.x,b.y,7,2,b.enemy?"#d86c35":families[player.family].accent);
      for(const m of mobs)drawMob(ctx,m,frame);
      drawPlatformPlayer(ctx,fighters[player.fighter],player,frame);
      if(noticeTimer>0)text(ctx,notice,320,92,10,"#f0eee7","center");
      if(missionState==="briefing"){rect(ctx,60,150,520,110,"rgba(0,0,0,.82)");text(ctx,"MISSION "+mission,320,170,12,"#f0eee7","center");text(ctx,"CLEAR ALL THREE FLOORS",320,194,7,families[player.family].accent,"center");text(ctx,"ENTER TO START",320,224,6,"#d5d8d7","center");}
    }
    raf=requestAnimationFrame(render);
  }

  function key(e:KeyboardEvent,down:boolean){
    if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")input2.left=down;
    if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")input2.right=down;
    if(e.key==="ArrowUp"||e.key.toLowerCase()==="w")input2.up=down;
    if(e.key===" "||e.key.toLowerCase()==="f")input2.fire=down;
    if(down&&e.key==="Enter"){
      if(mode==="select")startMission();
      else if(mode==="mission"&&missionState==="briefing")beginPlay();
      else if(mode==="result"){mission++;startMission();}
      else if(mode==="shop")mode="mission";
    }
    if(down&&e.key.toLowerCase()==="s"){if(mode==="mission"||mode==="result")openShop();}
    if(down&&e.key==="Escape"){if(mode==="shop")mode="mission";else mode="select";}
    if(down&&mode==="select"&&(e.key==="ArrowLeft"||e.key==="ArrowRight")){const ids:FamilyId[]=["valenti","moretti","rossi","bellini"];let i=ids.indexOf(familySelected);i=(i+(e.key==="ArrowRight"?1:-1)+4)%4;configureFamily(ids[i]);}
    if(down&&mode==="shop"){const keys=["1","2","3","4","5","6"];const idx=keys.indexOf(e.key);if(idx>=0)buyWeapon((["pocket","service","revolver","smg","shotgun","carbine"] as WeaponId[])[idx]);if(["7","8","9"].includes(e.key))buyArmor(armors[Number(e.key)-7]);}
  }
  const kd=(e:KeyboardEvent)=>{if(["ArrowLeft","ArrowRight","ArrowUp"," "].includes(e.key))e.preventDefault();key(e,true);};
  const ku=(e:KeyboardEvent)=>key(e,false);
  window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);

  root.querySelectorAll<HTMLButtonElement>("[data-mafia]").forEach(btn=>{
    const a=btn.dataset.mafia||"";
    const down=()=>{if(a==="left")input2.left=true;if(a==="right")input2.right=true;if(a==="up")input2.up=true;if(a==="fire")input2.fire=true;if(a==="shop")openShop();};
    const up=()=>{if(a==="left")input2.left=false;if(a==="right")input2.right=false;if(a==="up")input2.up=false;if(a==="fire")input2.fire=false;};
    btn.addEventListener("pointerdown",down);btn.addEventListener("pointerup",up);btn.addEventListener("pointercancel",up);btn.addEventListener("pointerleave",up);
  });
  configureFamily("valenti");raf=requestAnimationFrame(render);
  return ()=>{cancelAnimationFrame(raf);window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);input2.left=input2.right=input2.up=input2.down=input2.fire=false;host.innerHTML="";};
}
