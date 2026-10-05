/**
 * CARGO DECK — human joint constraints.
 * Values are gameplay-safe biomechanical limits, not a medical simulation.
 * Angles are radians. The solver deliberately clamps impossible poses before
 * they reach the render rig.
 */
export type JointName =
  | "neck" | "shoulderL" | "shoulderR" | "elbowL" | "elbowR"
  | "spine" | "hipL" | "hipR" | "kneeL" | "kneeR" | "ankleL" | "ankleR";

export interface JointLimit {
  min:number; max:number; damping:number; stiffness:number;
}

export const HUMAN_JOINT_LIMITS:Record<JointName,JointLimit>={
  neck:{min:-0.55,max:0.55,damping:10,stiffness:22},
  shoulderL:{min:-2.35,max:2.35,damping:8,stiffness:18},
  shoulderR:{min:-2.35,max:2.35,damping:8,stiffness:18},
  elbowL:{min:0.05,max:2.55,damping:11,stiffness:26},
  elbowR:{min:0.05,max:2.55,damping:11,stiffness:26},
  spine:{min:-0.34,max:0.34,damping:9,stiffness:20},
  hipL:{min:-1.85,max:1.25,damping:10,stiffness:22},
  hipR:{min:-1.85,max:1.25,damping:10,stiffness:22},
  kneeL:{min:0.0,max:2.45,damping:12,stiffness:28},
  kneeR:{min:0.0,max:2.45,damping:12,stiffness:28},
  ankleL:{min:-0.55,max:0.55,damping:10,stiffness:24},
  ankleR:{min:-0.55,max:0.55,damping:10,stiffness:24}
};

export function clampJoint(name:JointName,value:number):number{
  const l=HUMAN_JOINT_LIMITS[name];
  return Math.max(l.min,Math.min(l.max,value));
}

export function smoothJoint(
  name:JointName,current:number,target:number,dt:number
):number{
  const l=HUMAN_JOINT_LIMITS[name];
  const t=clampJoint(name,target);
  const k=1-Math.exp(-l.stiffness*Math.max(0,dt));
  const next=current+(t-current)*k;
  return Math.abs(t-next)<0.0005?t:next;
}

export interface HumanPose{
  spine:number;
  neck:number;
  hipL:number; hipR:number;
  kneeL:number; kneeR:number;
  ankleL:number; ankleR:number;
  shoulderL:number; shoulderR:number;
  elbowL:number; elbowR:number;
}

export const REST_POSE:HumanPose={
  spine:0,neck:0,hipL:0,hipR:0,kneeL:0.08,kneeR:0.08,
  ankleL:0,ankleR:0,shoulderL:0,shoulderR:0,elbowL:0.35,elbowR:0.35
};

export class HumanJointRig{
  pose:HumanPose={...REST_POSE};
  velocity:HumanPose={...REST_POSE};

  solve(target:Partial<HumanPose>,dt:number){
    for(const k of Object.keys(this.pose) as (keyof HumanPose)[]){
      const name=k as JointName;
      const desired=target[k]??this.pose[k];
      this.pose[k]=smoothJoint(name,this.pose[k],desired,dt);
    }
    return this.pose;
  }
}
