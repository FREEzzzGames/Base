/* FREEzzz district detail pass — deterministic Soviet urban micro-details. */
export interface DistrictRect{x:number;y:number;w:number;h:number;kind?:string}
export interface DistrictRoad{x:number;y:number;w:number;h:number}
const R=(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,f:string)=>{c.fillStyle=f;c.fillRect(x,y,w,h)}
const L=(c:CanvasRenderingContext2D,x1:number,y1:number,x2:number,y2:number,f:string,w=1)=>{c.strokeStyle=f;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
const E=(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,f:string,r=0)=>{c.save();c.translate(x,y);c.rotate(r);c.fillStyle=f;c.beginPath();c.ellipse(0,0,rx,ry,0,0,Math.PI*2);c.fill();c.restore()}
const P=(c:CanvasRenderingContext2D,p:number[],f:string)=>{c.fillStyle=f;c.beginPath();c.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)c.lineTo(p[i],p[i+1]);c.closePath();c.fill()}
function roadWear(c:CanvasRenderingContext2D,roads:DistrictRoad[]){
 const patches=[[74,414,74,9],[458,472,48,8],[792,407,82,9],[1134,474,66,8],[82,861,58,8],[398,887,72,9],[812,704,54,8],[1082,850,86,8],[1280,546,54,7],[660,286,8,48],[687,606,7,52],[1196,694,8,44]];
 patches.forEach(([x,y,w,h],i)=>{R(c,x,y,w,h,i%2?"#575b5a":"#5d6160");L(c,x+4,y+h*.5,x+w-6,y+h*.5,"rgba(35,38,38,.38)",1);L(c,x+w*.35,y+2,x+w*.62,y+h-2,"rgba(125,116,102,.24)",1)});
 const cracks=[[112,445,145,448],[272,374,304,379],[782,456,821,451],[1010,393,1050,397],[1184,610,1216,604],[450,830,478,835],[870,925,904,920],[1265,895,1300,900]];
 cracks.forEach(([a,b,d,e])=>{L(c,a,b,d,e,"rgba(25,29,29,.42)");L(c,a+6,b,a+2,b+5,"rgba(25,29,29,.3)")});
 roads.forEach((r,i)=>{const horizontal=r.w>r.h,span=horizontal?r.w:r.h;for(let n=0;n<span/46;n++){const q=12+n*46;if(horizontal)L(c,r.x+q,r.y+2,r.x+q+11,r.y+3,"rgba(65,69,66,.24)");else L(c,r.x+2,r.y+q,r.x+3,r.y+q+11,"rgba(65,69,66,.24)")}})
}
function drain(c:CanvasRenderingContext2D,x:number,y:number,rot=0){c.save();c.translate(x,y);c.rotate(rot);E(c,0,0,10,5,"#444948");E(c,0,-1,8,3,"#777a76");for(let i=-5;i<=5;i+=3)L(c,i,-2,i+2,"#303535",1);c.restore()}
function pole(c:CanvasRenderingContext2D,x:number,y:number,h:number,i:number){R(c,x-2,y-h,4,h,"#343a3b");R(c,x-11,y-h+6,22,4,"#41494a");R(c,x-7,y-h+2,14,4,"#232a2b");R(c,x-5,y-h+1,10,2,i%2?"#c0a668":"#d0bb70");L(c,x-9,y-h+10,x-9,y-h+30,"#4a5152",2);L(c,x+9,y-h+10,x+9,y-h+30,"#4a5152",2)}
function wire(c:CanvasRenderingContext2D,x1:number,y1:number,x2:number,y2:number,drop:number){c.strokeStyle="rgba(30,38,39,.4)";c.lineWidth=1;c.beginPath();c.moveTo(x1,y1);c.quadraticCurveTo((x1+x2)/2,(y1+y2)/2+drop,x2,y2);c.stroke()}
function sign(c:CanvasRenderingContext2D,x:number,y:number,type:"P"|"X"){R(c,x-1,y-28,2,28,"#3c4344");R(c,x-8,y-36,16,12,"#d6d6cf");R(c,x-6,y-34,12,8,type==="P"?"#6d8587":"#9a6b50");c.fillStyle="#ece9df";c.font="700 7px monospace";c.textAlign="center";c.fillText(type,x,y-27)}
function entrance(c:CanvasRenderingContext2D,b:DistrictRect,i:number){if(b.kind==="school")return;const n=Math.max(1,Math.floor(b.w/230));for(let k=0;k<n;k++){const x=b.x+(k+.5)*b.w/n,y=b.y+b.h+Math.min(26,b.h*.1);R(c,x-19,y-5,38,5,"#666e6d");R(c,x-14,y,28,15,"#353d3e");R(c,x-10,y+3,20,12,i%3===0?"#70513b":"#4c5a5a");R(c,x-18,y-8,36,3,"#93958f");for(let s=0;s<3;s++)R(c,x-16+s*11,y+15,8,3,"#aaa79c")}}
function wear(c:CanvasRenderingContext2D,b:DistrictRect,i:number){if(b.kind==="school")return;const n=Math.max(2,Math.floor(b.w/170));for(let k=0;k<n;k++){const x=b.x+20+k*((b.w-40)/Math.max(1,n-1)),y=b.y+b.h*.2+(i%4)*5;L(c,x,y,x-2,y+25+(k%3)*9,"rgba(28,35,36,.23)",1);if((k+i)%3===0)L(c,x+3,y+2,x+5,y+17,"rgba(205,199,184,.16)",1)}}
function tufts(c:CanvasRenderingContext2D){const pts=[[74,650],[104,675],[272,625],[315,680],[520,640],[552,705],[780,635],[822,665],[1002,610],[1040,650],[1250,620],[1305,675],[90,1040],[285,1020],[560,1045],[805,1010],[1010,1040],[1280,1025],[1430,1080]];for(const [x,y] of pts)for(let i=0;i<4;i++)L(c,x+i*2,y,x-2+i*3,y-6-(i%2)*3,"#547046",1)}
function dumpster(c:CanvasRenderingContext2D,x:number,y:number,i:number){R(c,x,y,25,20,"#354043");R(c,x+3,y+3,19,13,i%2?"#465457":"#3d4c4f");R(c,x-2,y-4,29,4,"#66706e");R(c,x+5,y+7,8,2,"#1e2628");R(c,x+4,y+20,4,3,"#202729");R(c,x+17,y+20,4,3,"#202729")}
function fence(c:CanvasRenderingContext2D,x:number,y:number,w:number){L(c,x,y,x+w,y,"#5b6668",2);for(let q=0;q<=w;q+=12)L(c,x+q,y,x+q,y-16,"#687375",2);L(c,x,y-16,x+w,y-16,"#687375",2)}
export function drawDistrictMicroDetails(c:CanvasRenderingContext2D,buildings:DistrictRect[],roads:DistrictRoad[]){
 c.save();c.lineCap="square";roadWear(c,roads);
 [[338,515],[742,514],[1098,515],[338,850],[742,850],[1098,850],[665,392],[665,735],[1145,392],[1145,735]].forEach(([x,y],i)=>drain(c,x,y,i>5?Math.PI/2:0));
 [[92,505,54],[564,640,66],[772,500,58],[1228,508,64],[548,940,58],[1272,940,62]].forEach(([x,y,h],i)=>pole(c,x,y,h,i));
 wire(c,92,451,564,574,18);wire(c,564,574,772,442,16);wire(c,772,442,1228,444,24);wire(c,548,882,1272,878,18);
 sign(c,362,516,"P");sign(c,786,516,"X");sign(c,1168,515,"P");sign(c,355,854,"P");sign(c,1115,854,"X");sign(c,1300,854,"P");
 dumpster(c,286,874,0);dumpster(c,319,874,1);dumpster(c,1006,874,2);dumpster(c,1038,874,3);fence(c,276,870,84);fence(c,996,870,84);
 buildings.forEach((b,i)=>{entrance(c,b,i);wear(c,b,i)});tufts(c);
 [[402,205],[872,205],[402,752],[1038,752],[372,930],[895,930]].forEach(([x,y])=>{R(c,x,y,46,5,"#744a31");R(c,x+3,y+7,5,13,"#4b3b30");R(c,x+37,y+7,5,13,"#4b3b30");L(c,x+3,y-3,x+42,y-3,"#8b5a38",2)});
 fence(c,90,650,70);fence(c,1235,650,92);fence(c,540,1040,70);fence(c,1280,1038,70);c.restore()
}
export function drawWeaponEffects(c:CanvasRenderingContext2D,x:number,y:number,a:number,scale:number,kind:number,active:boolean,accent:string){
 if(!active)return;c.save();c.translate(x,y);c.rotate(a);const len=[32,38,42,49,55,61][kind]||36,s=Math.max(.7,scale);
 P(c,[len+2,-4*s,len+15,0,len+2,4*s,len+7,0],"#f0d36e");P(c,[len+5,-2*s,len+21,0,len+5,2*s],"#d86c35");E(c,len+5,0,7*s,5*s,"rgba(255,224,117,.28)");L(c,len-2,0,len+12,0,accent,1);R(c,8,-7*s,3*s,2*s,"#c7ad72");c.restore()
}