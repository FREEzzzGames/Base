// Pixel Soldier — procedural low-poly 3D model contract and renderer.
// Built from the supplied skeleton/material specification without a runtime
// dependency on Three.js. The renderer is intentionally isolated from combat.

export const PixelSoldierModelConfig={
  metadata:{id:"pixel_soldier_tactical",name:"Pixel Soldier",version:"1.0.0",format:"procedural-gltf-compatible",polycount:"low-poly",rigged:true},
  skeleton:{
    root:"PixelSoldier_Root",
    joints:{
      head:"Head_Helmet_Joint",
      torso:"Torso_Armor_Joint",
      rightArm:"Right_Arm_Joint",
      leftArm:"Left_Arm_Joint",
      rightShoulder:"Right_Shoulder",
      rightElbow:"Right_Elbow",
      leftShoulder:"Left_Shoulder",
      leftElbow:"Left_Elbow",
      rightHip:"Right_Hip",
      rightKnee:"Right_Knee",
      leftHip:"Left_Hip",
      leftKnee:"Left_Knee"
    }
  },
  materials:{
    camoPrimary:"#b39b7d",
    camoSecondary:"#6e6250",
    armorPlates:"#4a453f",
    visorGlass:"#111111",
    metalJoints:"#c0c0c0"
  },
  animations:{
    IDLE:"idle_tactical_breathing",
    AIM:"weapon_aim_stand",
    RUN:"patrol_walk_camo",
    HIT:"damage_reaction",
    SHOOT:"shoot_tactical"
  }
} as const;

export interface PixelSoldierFrame{
  ctx:CanvasRenderingContext2D;
  baseX:number;baseY:number;facing:number;scale:number;
  moving:number;walkPhase:number;aiming:boolean;firing:number;color:string;
  project:(x:number,y:number,z:number)=>{x:number;y:number};
}

type P={x:number;y:number;z:number};
const M=PixelSoldierModelConfig.materials;

function localPoint(x:number,y:number,z:number,angle:number,frame:PixelSoldierFrame):P{
  const c=Math.cos(angle),s=Math.sin(angle);
  return {x:frame.baseX+(x*c-y*s)*frame.scale,y:frame.baseY+(x*s+y*c)*frame.scale,z:z*frame.scale};
}
function project(frame:PixelSoldierFrame,p:P){
  return frame.project(p.x,p.y,p.z);
}
function box(frame:PixelSoldierFrame,cx:number,cy:number,cz:number,w:number,d:number,h:number,rot:number,front:string,side:string,top:string){
  const pts=[
    localPoint(cx-w*.5,cy-d*.5,cz,rot,frame),localPoint(cx+w*.5,cy-d*.5,cz,rot,frame),
    localPoint(cx+w*.5,cy+d*.5,cz,rot,frame),localPoint(cx-w*.5,cy+d*.5,cz,rot,frame)
  ];
  const hi=pts.map(p=>({...p,z:p.z+h*frame.scale}));
  const lo=pts.map(p=>project(frame,p)),up=hi.map(p=>project(frame,p));
  const draw=(a:{x:number;y:number}[],fill:string,stroke=0)=>{
    frame.ctx.beginPath();frame.ctx.moveTo(a[0].x,a[0].y);for(let i=1;i<a.length;i++)frame.ctx.lineTo(a[i].x,a[i].y);frame.ctx.closePath();
    frame.ctx.fillStyle=fill;frame.ctx.fill();if(stroke){frame.ctx.strokeStyle="#10171b";frame.ctx.lineWidth=stroke;frame.ctx.stroke();}
  };
  draw([lo[0],lo[1],up[1],up[0]],front,.65);
  draw([lo[1],lo[2],up[2],up[1]],side,.65);
  draw([up[0],up[1],up[2],up[3]],top,.75);
}
function limb(frame:PixelSoldierFrame,a:P,b:P,width:number,front:string,side:string){
  const pa=project(frame,a),pb=project(frame,b);
  const dx=pb.x-pa.x,dy=pb.y-pa.y,len=Math.hypot(dx,dy)||1,nx=-dy/len*width*frame.scale*.5,ny=dx/len*width*frame.scale*.5;
  const q=[{x:pa.x+nx,y:pa.y+ny},{x:pb.x+nx,y:pb.y+ny},{x:pb.x-nx,y:pb.y-ny},{x:pa.x-nx,y:pa.y-ny}];
  frame.ctx.beginPath();frame.ctx.moveTo(q[0].x,q[0].y);for(let i=1;i<4;i++)frame.ctx.lineTo(q[i].x,q[i].y);frame.ctx.closePath();
  frame.ctx.fillStyle=front;frame.ctx.fill();frame.ctx.strokeStyle="#10171b";frame.ctx.lineWidth=Math.max(.55,frame.scale*.035);frame.ctx.stroke();
  frame.ctx.globalAlpha=.8;frame.ctx.strokeStyle=side;frame.ctx.lineWidth=Math.max(.6,frame.scale*.05);
  frame.ctx.beginPath();frame.ctx.moveTo(q[1].x,q[1].y);frame.ctx.lineTo(q[1].x-width*frame.scale*.25,q[1].y-width*frame.scale*.35);frame.ctx.stroke();frame.ctx.globalAlpha=1;
}
function joint(frame:PixelSoldierFrame,p:P,r:number){
  const q=project(frame,p);frame.ctx.fillStyle=M.metalJoints;frame.ctx.beginPath();frame.ctx.arc(q.x,q.y,r*frame.scale,0,Math.PI*2);frame.ctx.fill();
  frame.ctx.strokeStyle="#202427";frame.ctx.lineWidth=Math.max(.6,frame.scale*.04);frame.ctx.stroke();
}
function visor(frame:PixelSoldierFrame,p:P,w:number,h:number){
  const q=project(frame,p);frame.ctx.save();frame.ctx.fillStyle=M.visorGlass;frame.ctx.strokeStyle=frame.color;frame.ctx.globalAlpha=.9;frame.ctx.lineWidth=Math.max(.7,frame.scale*.06);
  frame.ctx.beginPath();frame.ctx.roundRect(q.x-w*frame.scale*.5,q.y-h*frame.scale*.5,w*frame.scale,h*frame.scale,2*frame.scale);frame.ctx.fill();frame.ctx.stroke();frame.ctx.restore();
}
export function renderPixelSoldier3D(frame:PixelSoldierFrame):void{
  const ctx=frame.ctx, s=frame.scale;
  const gait=Math.sin(frame.walkPhase)*frame.moving;
  const recoil=frame.firing>0?Math.min(1,frame.firing):0;
  const aim=frame.aiming;
  ctx.save();

  // Tactical shadow / contact glow.
  const foot=project(frame,localPoint(0,0,0,0,frame));
  ctx.globalAlpha=.30;ctx.fillStyle="#000";ctx.beginPath();ctx.ellipse(foot.x,foot.y+3,5.8*s,2.0*s,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;

  // Legs: articulated hip -> knee -> boot chain.
  const legL=localPoint(-1.55,.05,0,0,frame),legR=localPoint(1.55,.05,0,0,frame);
  const kneeL=localPoint(-1.55,.05,5.8,0,frame),kneeR=localPoint(1.55,.05,5.8,0,frame);
  kneeL.x+=gait*1.05*s;kneeR.x-=gait*1.05*s;
  const hipL=localPoint(-1.55,0,9.8,0,frame),hipR=localPoint(1.55,0,9.8,0,frame);
  limb(frame,legL,kneeL,2.0,M.camoSecondary,M.armorPlates);limb(frame,kneeL,hipL,2.25,M.armorPlates,M.camoSecondary);
  limb(frame,legR,kneeR,2.0,M.camoSecondary,M.armorPlates);limb(frame,kneeR,hipR,2.25,M.armorPlates,M.camoSecondary);
  box(frame,-1.55,-.15,0,2.7,3.4,1.8,0,M.armorPlates,"#34312d","#5c574e");
  box(frame,1.55,-.15,0,2.7,3.4,1.8,0,M.armorPlates,"#34312d","#5c574e");
  joint(frame,kneeL,1.0);joint(frame,kneeR,1.0);

  // Armored pelvis and torso.
  box(frame,0,0,9.3,5.8,3.5,3.8,0,M.camoSecondary,M.armorPlates,M.camoPrimary);
  box(frame,0,0,12.3,6.7,3.8,6.0,0,M.armorPlates,"#34312d","#5c574e");
  box(frame,0,0,14.8,6.0,3.3,1.3,0,M.camoSecondary,M.armorPlates,"#746955");

  // Head/helmet with articulated neck.
  const head=localPoint(0,0,19.0,0,frame);
  const neck=localPoint(0,0,16.8,0,frame);joint(frame,neck,1.0);
  box(frame,0,0,18.9,4.4,3.6,4.0,0,M.camoPrimary,M.camoSecondary,M.armorPlates);
  box(frame,0,-.05,21.0,5.0,3.9,1.4,0,M.armorPlates,"#34312d","#6f6759");
  visor(frame,localPoint(0,-1.95,19.7,0,frame),2.8,1.0);

  // Shoulders and arms. Aim raises both forearms toward the weapon.
  const armRaise=aim?-.38:.08;
  const shoulderL=localPoint(-4.0,0,15.6,0,frame),shoulderR=localPoint(4.0,0,15.6,0,frame);
  const elbowL=localPoint(-4.45,-.10,11.9,armRaise,frame),elbowR=localPoint(4.45,-.10,11.9,armRaise,frame);
  const handL=localPoint(-3.65,-.35,10.2,armRaise,frame),handR=localPoint(3.65,-.35,10.2,armRaise,frame);
  elbowL.x+=gait*.45*s;elbowR.x-=gait*.45*s;
  limb(frame,shoulderL,elbowL,2.0,M.armorPlates,M.camoSecondary);limb(frame,elbowL,handL,1.7,M.camoSecondary,M.armorPlates);
  limb(frame,shoulderR,elbowR,2.0,M.armorPlates,M.camoSecondary);limb(frame,elbowR,handR,1.7,M.camoSecondary,M.armorPlates);
  joint(frame,shoulderL,1.05);joint(frame,shoulderR,1.05);joint(frame,elbowL,.8);joint(frame,elbowR,.8);

  // Tactical rifle follows the target-facing body and receives recoil.
  const rifleY=aim?-.75:-1.25+recoil*.8;
  box(frame,0,rifleY,13.0,1.15,2.2,1.0,0,M.armorPlates,"#252525","#55524b");
  box(frame,0,rifleY-1.55,13.35,.75,.75,2.8,0,"#252525","#181818","#6e6250");
  if(recoil>0){
    const muzzle=project(frame,localPoint(0,rifleY-3.1,13.45,0,frame));
    ctx.save();ctx.globalAlpha=recoil;ctx.fillStyle=frame.color;ctx.shadowColor=frame.color;ctx.shadowBlur=10*s;
    ctx.beginPath();ctx.arc(muzzle.x,muzzle.y,1.7*s,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  // Chest telemetry and visor highlight.
  const chest=project(frame,localPoint(0,-2.0,14.8,0,frame));
  ctx.fillStyle=frame.color;ctx.globalAlpha=.75;ctx.fillRect(chest.x-1.0*s,chest.y-1.0*s,2*s,.8*s);ctx.globalAlpha=1;

  ctx.restore();
}
