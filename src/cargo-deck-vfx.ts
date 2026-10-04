const CAP=160;
const TAU=Math.PI*2;

const PType={Particle:0,Flash:1,Ring:2,Tracer:3} as const;

export const VFX_COLORS={
  WHITE:0,
  CYAN:1,
  YELLOW:2,
  ORANGE:3,
  CRIMSON:4,
  PURPLE:5,
  GREEN:6,
  SMOKE:7
} as const;

const COLORS=[
  "#ffffff",
  "#66FCF1",
  "#FFB703",
  "#ff6a00",
  "#D90429",
  "#B45CFF",
  "#00FF66",
  "#5b6468"
];
const FLASH_SIZE=64;
const flashSprites:HTMLCanvasElement[]=[];
function buildFlashSprites():void{for(let c=0;c<COLORS.length;c++){const cv=document.createElement("canvas");cv.width=cv.height=FLASH_SIZE;const g2=cv.getContext("2d")!;const cx=FLASH_SIZE*.5;const grad=g2.createRadialGradient(cx,cx,0,cx,cx,cx);grad.addColorStop(0,"#ffffff");grad.addColorStop(.35,COLORS[c]);grad.addColorStop(1,"rgba(0,0,0,0)");g2.fillStyle=grad;g2.fillRect(0,0,FLASH_SIZE,FLASH_SIZE);flashSprites.push(cv)}}
buildFlashSprites();

const x=new Float32Array(CAP),y=new Float32Array(CAP);
const px=new Float32Array(CAP),py=new Float32Array(CAP);
const vx=new Float32Array(CAP),vy=new Float32Array(CAP);
const life=new Float32Array(CAP),maxLife=new Float32Array(CAP);
const size=new Float32Array(CAP),sizeVel=new Float32Array(CAP);
const drag=new Float32Array(CAP),gravity=new Float32Array(CAP);
const alpha=new Float32Array(CAP),width=new Float32Array(CAP);
const color=new Uint8Array(CAP),type=new Uint8Array(CAP);

let activeCount=0,recycleIndex=0;

function allocSlot(){
  if(activeCount<CAP)return activeCount++;
  const i=recycleIndex;
  recycleIndex=(recycleIndex+1)%CAP;
  return i;
}

function copySlot(dst:number,src:number){
  x[dst]=x[src];y[dst]=y[src];px[dst]=px[src];py[dst]=py[src];
  vx[dst]=vx[src];vy[dst]=vy[src];life[dst]=life[src];maxLife[dst]=maxLife[src];
  size[dst]=size[src];sizeVel[dst]=sizeVel[src];drag[dst]=drag[src];
  gravity[dst]=gravity[src];alpha[dst]=alpha[src];width[dst]=width[src];
  color[dst]=color[src];type[dst]=type[src];
}

export function clearVFX(){activeCount=0;recycleIndex=0}

export function emitParticle(
  x0:number,y0:number,vx0:number,vy0:number,life0:number,size0:number,
  colorIdx:number,sizeVel0=0,drag0=0,gravity0=0,alpha0=1
){
  const i=allocSlot();
  x[i]=x0;y[i]=y0;px[i]=x0;py[i]=y0;vx[i]=vx0;vy[i]=vy0;
  life[i]=life0;maxLife[i]=life0;size[i]=size0;sizeVel[i]=sizeVel0;
  drag[i]=drag0;gravity[i]=gravity0;alpha[i]=alpha0;width[i]=0;
  color[i]=colorIdx;type[i]=PType.Particle;
  return i;
}

export function emitBurst(
  x0:number,y0:number,count:number,speed:number,life0:number,size0:number,colorIdx:number,
  spread=TAU,angle=0,sizeVel0=0,drag0=0,gravity0=0,alpha0=1
){
  for(let n=0;n<count;n++){
    const a=angle+(Math.random()-.5)*spread;
    const s=speed*(.5+Math.random()*.5);
    const l=life0*(.65+Math.random()*.35);
    const sz=size0*(.65+Math.random()*.35);
    emitParticle(x0,y0,Math.cos(a)*s,Math.sin(a)*s,l,sz,colorIdx,sizeVel0,drag0,gravity0,alpha0);
  }
}

export function emitFlash(x0:number,y0:number,size0:number,life0:number,colorIdx:number,alpha0=1){
  const i=allocSlot();
  x[i]=x0;y[i]=y0;px[i]=x0;py[i]=y0;vx[i]=0;vy[i]=0;
  life[i]=life0;maxLife[i]=life0;size[i]=size0;sizeVel[i]=0;
  drag[i]=0;gravity[i]=0;alpha[i]=alpha0;width[i]=0;
  color[i]=colorIdx;type[i]=PType.Flash;
  return i;
}

export function emitRing(x0:number,y0:number,radius:number,speed:number,life0:number,colorIdx:number,width0=2,alpha0=1){
  const i=allocSlot();
  x[i]=x0;y[i]=y0;px[i]=x0;py[i]=y0;vx[i]=0;vy[i]=0;
  life[i]=life0;maxLife[i]=life0;size[i]=radius;sizeVel[i]=speed;
  drag[i]=0;gravity[i]=0;alpha[i]=alpha0;width[i]=width0;
  color[i]=colorIdx;type[i]=PType.Ring;
  return i;
}

export function emitTracer(x0:number,y0:number,vx0:number,vy0:number,life0:number,colorIdx:number,width0=2,alpha0=1){
  const i=allocSlot();
  x[i]=x0;y[i]=y0;px[i]=x0;py[i]=y0;vx[i]=vx0;vy[i]=vy0;
  life[i]=life0;maxLife[i]=life0;size[i]=0;sizeVel[i]=0;
  drag[i]=0;gravity[i]=0;alpha[i]=alpha0;width[i]=width0;
  color[i]=colorIdx;type[i]=PType.Tracer;
  return i;
}

export function emitMuzzleFlash(x0:number,y0:number,angle:number,scale=1){
  emitFlash(x0,y0,18*scale,0.045,VFX_COLORS.YELLOW,.95);
  emitBurst(x0,y0,5,110*scale,0.07,2.5*scale,VFX_COLORS.ORANGE,1.25,angle,-12,0,0,1);
  emitRing(x0,y0,2*scale,65*scale,0.075,VFX_COLORS.WHITE,1.5*scale,.8);
}

export function emitImpact(x0:number,y0:number,normalAngle:number){
  emitFlash(x0,y0,6,0.045,VFX_COLORS.WHITE,.9);
  emitBurst(x0,y0,6,75,0.16,1.8,VFX_COLORS.YELLOW,1.9,normalAngle,-20,0,0,1);
}

export function emitExplosion(x0:number,y0:number,radius:number){
  emitFlash(x0,y0,radius*.8,.11,VFX_COLORS.WHITE,1);
  emitRing(x0,y0,radius*.3,radius*2.1,.28,VFX_COLORS.ORANGE,3,1);
  emitBurst(x0,y0,18,radius*2.4,.38,3.5,VFX_COLORS.ORANGE,TAU,0,-8,1.2,42,1);
  emitBurst(x0,y0,9,radius*1.7,.5,4.5,VFX_COLORS.CRIMSON,TAU,0,4,.9,24,1);
}

export function emitDeath(x0:number,y0:number,colorIdx=VFX_COLORS.CRIMSON){
  emitFlash(x0,y0,10,.07,colorIdx,.8);
  emitBurst(x0,y0,10,55,.3,2.6,colorIdx,TAU,0,-12,1.8,70,1);
}

export function emitHitFlash(x0:number,y0:number){
  emitFlash(x0,y0,10,.045,VFX_COLORS.WHITE,.9);
}

export function updateVFX(dtFrames:number){
  const dt=Math.min(.05,Math.max(0,dtFrames/60));
  if(dt<=0)return;
  let i=0;
  while(i<activeCount){
    const l=life[i]-dt;
    if(l<=0){
      const last=--activeCount;
      if(i!==last)copySlot(i,last);
      continue;
    }
    life[i]=l;
    px[i]=x[i];py[i]=y[i];
    const d=drag[i];
    if(d>0){
      const f=Math.max(0,1-d*dt);
      vx[i]*=f;vy[i]*=f;
    }
    const g=gravity[i];
    if(g!==0)vy[i]+=g*dt;
    x[i]+=vx[i]*dt;y[i]+=vy[i]*dt;
    const sv=sizeVel[i];
    if(sv!==0)size[i]+=sv*dt;
    i++;
  }
}

export interface VFXCamera{x:number;y:number;zoom:number;width:number;height:number}

export function renderVFX(ctx:CanvasRenderingContext2D,camera:VFXCamera){
  const cw=camera.width*.5,ch=camera.height*.5,z=camera.zoom;
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  for(let i=0;i<activeCount;i++){
    const a=Math.max(0,Math.min(1,(life[i]/maxLife[i])*alpha[i]));
    if(a<=.01)continue;
    const sx=(x[i]-camera.x)*z+cw,sy=(y[i]-camera.y)*z+ch,s=size[i]*z;
    if(sx < -s || sx > camera.width+s || sy < -s || sy > camera.height+s)continue;
    ctx.globalAlpha=a;
    const ci=color[i],t=type[i];
    if(t===PType.Particle){
      ctx.fillStyle=COLORS[ci];
      ctx.fillRect(sx-s*.5,sy-s*.5,s,s);
    }else if(t===PType.Flash){const d2=s+s;ctx.drawImage(flashSprites[ci],sx-s,sy-s,d2,d2);}else if(t===PType.Ring){
      ctx.strokeStyle=COLORS[ci];
      ctx.lineWidth=Math.max(.75,width[i]*z);
      ctx.beginPath();ctx.arc(sx,sy,s,0,TAU);ctx.stroke();
    }else{
      ctx.strokeStyle=COLORS[ci];
      ctx.lineWidth=Math.max(.75,width[i]*z);
      const psx=(px[i]-camera.x)*z+cw,psy=(py[i]-camera.y)*z+ch;
      ctx.beginPath();ctx.moveTo(psx,psy);ctx.lineTo(sx,sy);ctx.stroke();
    }
  }
  ctx.restore();
}
