/* FREEzzz PHOTOREAL DISTRICT — final visual quality pass. */
export interface PhotoBuilding{x:number;y:number;w:number;h:number;roof:string;wall:string;kind:string}
export interface PhotoRoad{x:number;y:number;w:number;h:number}
const R=(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,f:string)=>{c.fillStyle=f;c.fillRect(x,y,w,h)}
const L=(c:CanvasRenderingContext2D,x1:number,y1:number,x2:number,y2:number,f:string,w=1)=>{c.strokeStyle=f;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
const E=(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,f:string,r=0)=>{c.save();c.translate(x,y);c.rotate(r);c.fillStyle=f;c.beginPath();c.ellipse(0,0,rx,ry,0,0,Math.PI*2);c.fill();c.restore()}

function asphalt(c:CanvasRenderingContext2D,r:PhotoRoad[]){
 for(let ri=0;ri<r.length;ri++){const q=r[ri];const g=c.createLinearGradient(q.x,q.y,q.x+(q.w>q.h?q.w:0),q.y+(q.h>q.w?q.h:0));g.addColorStop(0,"#3e4344");g.addColorStop(.5,"#454a4b");g.addColorStop(1,"#3b4041");R(c,q.x+3,q.y+3,q.w-6,q.h-6,g as unknown as string);
  const n=Math.max(6,Math.floor((q.w+q.h)/110));for(let i=0;i<n;i++){const horizontal=q.w>q.h;const x=horizontal?q.x+18+(i*83)%Math.max(20,q.w-36):q.x+q.w*.35+((i*17)%7);const y=horizontal?q.y+q.h*.30+((i*19)%7):q.y+18+(i*71)%Math.max(20,q.h-36);const w=8+(i%5)*7;L(c,x,y,x+(horizontal?w:2),y+(horizontal?2:w),"rgba(20,24,24,.20)",1);if(i%4===0)E(c,x+3,y+2,5+(i%3)*2,2,"rgba(15,18,18,.11)",.2)}
  if(q.w>q.h){for(let i=0;i<3;i++)L(c,q.x+18,q.y+q.h*.28+i*2,q.x+q.w-20,q.y+q.h*.28+i*2,"rgba(25,28,28,.09)",1)}else{for(let i=0;i<3;i++)L(c,q.x+q.w*.32+i*2,q.y+18,q.x+q.w*.32+i*2,q.y+q.h-20,"rgba(25,28,28,.09)",1)}
 }
}
function curbAndSidewalk(c:CanvasRenderingContext2D,r:PhotoRoad[]){for(const q of r){const h=q.w>q.h,span=h?q.w:q.h;for(let i=0;i<span;i+=32){if(h){L(c,q.x+i,q.y-3,q.x+i+16,q.y-3,"rgba(90,93,89,.34)",1);L(c,q.x+i+2,q.y+q.h+3,q.x+i+18,q.y+q.h+3,"rgba(72,76,73,.34)",1)}else{L(c,q.x-3,q.y+i,q.x-3,q.y+i+16,"rgba(90,93,89,.34)",1);L(c,q.x+q.w+3,q.y+i,q.x+q.w+3,q.y+i+16,"rgba(72,76,73,.34)",1)}}}}
function roofDetails(c:CanvasRenderingContext2D,b:PhotoBuilding,index:number){
 const inset=8;R(c,b.x+inset,b.y+inset,b.w-16,3,"rgba(20,26,27,.36)");R(c,b.x+inset,b.y+b.h-21,b.w-16,3,"rgba(20,26,27,.32)");
 const seams=Math.max(3,Math.floor(b.w/70));for(let i=0;i<seams;i++){const x=b.x+18+i*(b.w-36)/seams;L(c,x,b.y+12,x,b.y+b.h-27,"rgba(170,174,166,.12)",1)}
 const units=Math.max(1,Math.floor(b.w/170));for(let i=0;i<units;i++){const x=b.x+30+i*((b.w-60)/Math.max(1,units)),y=b.y+26+(index%3)*9;R(c,x,y,27,18,"#343b3c");R(c,x+3,y+3,21,10,"#596160");for(let k=0;k<4;k++)R(c,x+4+k*5,y+13,2,4,"#202728")}
 for(let i=0;i<2;i++){const x=b.x+b.w*.72+i*14,y=b.y+b.h*.24+(index%4)*4;R(c,x,y,7,5,"#777a75");L(c,x+3,y,x+3,y-10,"#3c4445",1)}
 if(index%3===0){const x=b.x+b.w*.22,y=b.y+b.h*.70;E(c,x,y,9,4,"#4d5554",-0.25);E(c,x-1,y-2,6,3,"#737a75",-0.25);L(c,x-1,y-2,x-5,y-13,"#3e4646",1)}
}
function facadeWear(c:CanvasRenderingContext2D,b:PhotoBuilding,index:number){
 const count=Math.max(3,Math.floor(b.w/80));for(let i=0;i<count;i++){const x=b.x+18+((i*53+index*17)%(Math.max(30,b.w-36)));const y=b.y+35+((i*29+index*11)%(Math.max(25,b.h-70)));const len=7+(i%5)*6;L(c,x,y,x-2,y+len,"rgba(15,22,23,.16)",1);if(i%3===0)L(c,x+3,y+2,x+5,y+len*.6,"rgba(218,211,193,.10)",1)}
 if(b.kind!=="brick")for(let x=b.x+28;x<b.x+b.w-12;x+=Math.max(54,b.w/5))L(c,x,b.y+9,x,b.y+b.h-25,"rgba(205,208,198,.10)",1)
}
function windowsAndBalconies(c:CanvasRenderingContext2D,b:PhotoBuilding,index:number){
 if(b.kind==="school")return;const cols=Math.max(4,Math.floor(b.w/48)),rows=Math.max(2,Math.floor(b.h/48)),gx=(b.w-28)/cols,gy=(b.h-42)/rows;
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){if((row*cols+col+index)%5===0)continue;const x=b.x+14+col*gx,y=b.y+18+row*gy,w=Math.min(18,gx-7),h=Math.min(10,gy-8);R(c,x-2,y-2,w+4,h+4,"#20282a");const glass=(row+col+index)%4===0?"#70898b":(row+col)%3===0?"#4b666a":"#3c5559";R(c,x,y,w,h,glass);R(c,x+1,y+1,w-2,2,"rgba(229,232,221,.18)");L(c,x+w*.5,y+1,x+w*.5,y+h-1,"#27383a",1);if((row+col+index)%7===0)R(c,x+2,y+h-3,w-4,2,"rgba(25,31,31,.38)")}
 const n=Math.max(1,Math.floor(b.w/180));for(let i=0;i<n;i++){const x=b.x+42+i*((b.w-84)/Math.max(1,n)),y=b.y+b.h*.58+(i%2)*11;R(c,x,y,27,4,"#a0a29b");R(c,x+2,y+4,23,2,"#4b5555");for(let k=0;k<5;k++)L(c,x+4+k*4.5,y+4,x+4+k*4.5,y+13,"#737a78",1);R(c,x+3,y+13,21,3,"#303738")}
}
function groundContact(c:CanvasRenderingContext2D,b:PhotoBuilding){E(c,b.x+b.w*.5,b.y+b.h+7,b.w*.45,8,"rgba(5,9,10,.18)");R(c,b.x,b.y+b.h-5,b.w,5,"rgba(12,18,19,.18)");R(c,b.x+b.w-5,b.y+8,5,b.h-16,"rgba(8,13,14,.12)")}
function grassDetail(c:CanvasRenderingContext2D){const pts=[[42,612],[70,672],[112,700],[275,615],[320,670],[520,628],[555,710],[785,630],[825,680],[1000,605],[1040,650],[1248,620],[1310,690],[90,1040],[285,1022],[555,1048],[805,1018],[1015,1045],[1285,1025],[1430,1080]];for(let i=0;i<pts.length;i++){const[x,y]=pts[i];for(let k=0;k<5;k++){const dx=(k%3)*3-3,hh=5+(k%4)*2;L(c,x+dx,y,x+dx-2,y-hh,i%3===0?"#5b7c4d":"#4d7045",1)}}}
export function drawPhotorealDistrict(c:CanvasRenderingContext2D,buildings:PhotoBuilding[],roads:PhotoRoad[]){c.save();asphalt(c,roads);curbAndSidewalk(c,roads);grassDetail(c);for(let i=0;i<buildings.length;i++){const b=buildings[i];groundContact(c,b);roofDetails(c,b,i);facadeWear(c,b,i);windowsAndBalconies(c,b,i)}c.restore()}
