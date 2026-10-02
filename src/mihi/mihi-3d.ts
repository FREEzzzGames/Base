import type {PortalEventBus} from "../core/portal-core";
import type {MihiLayer} from "./mihi-types";

const LOCAL_MODEL_URL=new URL(import.meta.env.BASE_URL+"mihi/animated-woman.glb",window.location.href).toString();
const REMOTE_MODEL_URL="https://static.poly.pizza/46d6db5a-3c9f-4238-8cdf-8eb7194498dc.glb";

type MihiVisualState={layer:MihiLayer};

export class Mihi3DView{
  private readonly root:HTMLElement;
  private readonly canvas:HTMLCanvasElement;
  private renderer:import("three").WebGLRenderer|null=null;
  private scene:import("three").Scene|null=null;
  private camera:import("three").PerspectiveCamera|null=null;
  private mixer:import("three").AnimationMixer|null=null;
  private actions=new Map<string,import("three").AnimationAction>();
  private activeAction:import("three").AnimationAction|null=null;
  private model:import("three").Object3D|null=null;
  private frame=0;
  private resizeObserver?:ResizeObserver;
  private loaded=false;
  private disposed=false;
  private loadPromise:Promise<void>|null=null;
  private offs:(()=>void)[]=[];

  constructor(private readonly events:PortalEventBus){
    this.root=document.createElement("div");
    this.root.className="mihi-3d";
    this.root.dataset.mihi3d="1";
    this.root.innerHTML='<canvas class="mihi-3d-canvas" aria-hidden="true"></canvas><span class="mihi-3d-status" data-mihi-3d-status>MIHI 3D</span>';
    this.canvas=this.root.querySelector<HTMLCanvasElement>("canvas")!;
    this.bind();
  }

  mount(host:HTMLElement){
    host.append(this.root);
    this.resizeObserver=new ResizeObserver(()=>this.resize());
    this.resizeObserver.observe(this.root);
    void this.load();
  }

  private bind(){
    this.offs=[
      this.events.on("mihi:state",state=>this.selectForState({layer:state.layer as MihiLayer})),
      this.events.on("mihi:request-action",payload=>{if(payload.source==="mihi")this.play("Interact");})
    ];
  }

  private async load(){
    if(this.loadPromise)return this.loadPromise;
    this.loadPromise=this.loadInternal();
    return this.loadPromise;
  }

  private async loadInternal(){
    try{
      const [THREE,loaderModule]=await Promise.all([
        import("three"),
        import("three/examples/jsm/loaders/GLTFLoader.js")
      ]);
      if(this.disposed)return;

      const renderer=new THREE.WebGLRenderer({
        canvas:this.canvas,
        alpha:true,
        antialias:true,
        powerPreference:"high-performance",
        preserveDrawingBuffer:false
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000,0);

      const scene=new THREE.Scene();
      const camera=new THREE.PerspectiveCamera(22,1,0.01,100);
      camera.position.set(0,0.95,5.6);
      camera.lookAt(0,0.82,0);

      scene.add(new THREE.HemisphereLight(0xffffff,0x182033,2.4));
      const key=new THREE.DirectionalLight(0xffffff,2.5);
      key.position.set(2.5,3.5,4);
      scene.add(key);
      const fill=new THREE.DirectionalLight(0x8fb8ff,1.25);
      fill.position.set(-2,1.5,2);
      scene.add(fill);
      const rim=new THREE.DirectionalLight(0xff8fb8,0.8);
      rim.position.set(1,2,-3);
      scene.add(rim);

      this.renderer=renderer;
      this.scene=scene;
      this.camera=camera;

      const loader=new loaderModule.GLTFLoader();
      loader.setCrossOrigin("anonymous");

      // Always show a local procedural MIHI immediately. The optional GLB must never
      // block first paint or leave an empty stage when an external asset is slow.
      this.attachProceduralModel(THREE);
      this.loaded=true;
      this.setStatus("");
      this.resize();
      this.animate();

      let loadedModel:import("three").Object3D|null=null;
      let animations:import("three").AnimationClip[]=[];

      for(const url of [LOCAL_MODEL_URL,REMOTE_MODEL_URL]){
        try{
          const gltf=await Promise.race([
            loader.loadAsync(url),
            new Promise<never>((_,reject)=>window.setTimeout(()=>reject(new Error("MIHI asset timeout")),5000))
          ]);
          if(gltf?.scene){
            loadedModel=gltf.scene;
            animations=gltf.animations||[];
            break;
          }
        }catch(error){
          console.warn("MIHI 3D asset unavailable:",url,error);
        }
      }

      if(this.disposed){
        renderer.dispose();
        return;
      }

      if(loadedModel){
        this.model?.removeFromParent();
        this.mixer=null;
        this.actions.clear();
        this.activeAction=null;
        this.attachModel(THREE,loadedModel,animations);
      }

      this.play("Idle_Neutral");
      this.resize();
    }catch(error){
      console.warn("MIHI 3D renderer unavailable",error);
      this.setStatus("3D fallback");
      try{
        const THREE=await import("three");
        const renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
        renderer.setClearColor(0x000000,0);
        const scene=new THREE.Scene();
        const camera=new THREE.PerspectiveCamera(22,1,0.01,100);
        camera.position.set(0,1.0,4.8);
        camera.lookAt(0,0.9,0);
        scene.add(new THREE.HemisphereLight(0xffffff,0x182033,2.4));
        const light=new THREE.DirectionalLight(0xffffff,2.5);
        light.position.set(2,3,4);
        scene.add(light);
        this.renderer=renderer;
        this.scene=scene;
        this.camera=camera;
        this.attachProceduralModel(THREE);
        this.loaded=true;
        this.resize();
        this.animate();
      }catch(fallbackError){
        console.warn("MIHI procedural 3D fallback unavailable",fallbackError);
      }
    }
  }

  private attachModel(THREE:typeof import("three"),model:import("three").Object3D,animations:import("three").AnimationClip[]){
    const box=new THREE.Box3().setFromObject(model);
    const size=box.getSize(new THREE.Vector3());
    const center=box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    model.position.y-=size.y*0.08;
    const targetHeight=Math.max(size.y,0.001);
    model.scale.setScalar(0.78/targetHeight);
    model.rotation.y=0.08;
    this.scene!.add(model);
    this.model=model;

    this.mixer=new THREE.AnimationMixer(model);
    for(const clip of animations){
      const name=clip.name.split("|").pop()||clip.name;
      this.actions.set(name,this.mixer.clipAction(clip));
    }
  }

  private attachProceduralModel(THREE:typeof import("three")){
    const group=new THREE.Group();

    const skin=new THREE.MeshStandardMaterial({color:0xd9a27c,roughness:0.72,metalness:0.02});
    const suit=new THREE.MeshStandardMaterial({color:0x252936,roughness:0.55,metalness:0.15});
    const accent=new THREE.MeshStandardMaterial({color:0x8fb8ff,roughness:0.35,metalness:0.35});
    const dark=new THREE.MeshStandardMaterial({color:0x11131a,roughness:0.7});

    const torso=new THREE.Mesh(new THREE.CapsuleGeometry(0.28,0.55,8,16),suit);
    torso.position.y=0.86;
    group.add(torso);

    const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.1,0.12,12),skin);
    neck.position.y=1.28;
    group.add(neck);

    const head=new THREE.Mesh(new THREE.SphereGeometry(0.25,24,18),skin);
    head.position.y=1.53;
    group.add(head);

    const hair=new THREE.Mesh(new THREE.SphereGeometry(0.255,24,12,0,Math.PI*2,0,Math.PI*0.48),dark);
    hair.position.set(0,1.59,0);
    group.add(hair);

    const eyeMat=new THREE.MeshStandardMaterial({color:0x101218,roughness:0.25});
    for(const x of [-0.085,0.085]){
      const eye=new THREE.Mesh(new THREE.SphereGeometry(0.028,10,8),eyeMat);
      eye.position.set(x,1.55,0.235);
      group.add(eye);
    }

    for(const x of [-0.37,0.37]){
      const arm=new THREE.Mesh(new THREE.CapsuleGeometry(0.075,0.42,6,10),suit);
      arm.position.set(x,0.9,0);
      arm.rotation.z=x>0?-0.08:0.08;
      group.add(arm);
      const hand=new THREE.Mesh(new THREE.SphereGeometry(0.075,12,8),skin);
      hand.position.set(x,0.62,0);
      group.add(hand);
    }

    for(const x of [-0.13,0.13]){
      const leg=new THREE.Mesh(new THREE.CapsuleGeometry(0.085,0.48,6,10),dark);
      leg.position.set(x,0.3,0);
      group.add(leg);
      const shoe=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.08,0.32),accent);
      shoe.position.set(x,0.03,0.05);
      group.add(shoe);
    }

    const badge=new THREE.Mesh(new THREE.CircleGeometry(0.055,16),accent);
    badge.position.set(0,1.02,0.285);
    badge.rotation.x=-Math.PI/2;
    group.add(badge);

    group.position.y=-0.05;
    group.scale.setScalar(0.58);
    const platformMaterial=new THREE.MeshStandardMaterial({color:0x101827,roughness:0.35,metalness:0.55,transparent:true,opacity:0.92});
    const platform=new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.62,0.045,48),platformMaterial);
    platform.position.y=0.01;
    group.add(platform);

    const ringMaterial=new THREE.MeshBasicMaterial({color:0x8fb8ff,transparent:true,opacity:0.7});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.48,0.012,8,64),ringMaterial);
    ring.rotation.x=Math.PI/2;
    ring.position.y=0.045;
    group.add(ring);

    this.scene!.add(group);
    this.model=group;
  }

  private setStatus(text:string){
    const el=this.root.querySelector<HTMLElement>("[data-mihi-3d-status]");
    if(el)el.textContent=text;
    this.root.classList.toggle("mihi-3d-failed",false);
  }

  private selectForState(state:MihiVisualState){
    if(!this.loaded)return;
    if(state.layer>=8){this.play("Interact");return;}
    if(state.layer>=5){this.play("Wave");return;}
    this.play("Idle_Neutral");
  }

  private play(name:string){
    const next=this.actions.get(name)||this.actions.get("Idle_Neutral")||this.actions.get("Idle")||this.actions.get("Interact");
    if(!next||next===this.activeAction)return;
    this.activeAction?.fadeOut(0.2);
    next.reset().fadeIn(0.2).play();
    this.activeAction=next;
  }

  private resize(){
    if(!this.renderer||!this.camera)return;
    const width=Math.max(1,this.root.clientWidth);
    const height=Math.max(1,this.root.clientHeight);
    this.renderer.setSize(width,height,false);
    this.camera.aspect=width/height;
    this.camera.updateProjectionMatrix();
  }

  private animate=()=>{
    if(this.disposed)return;
    this.frame=requestAnimationFrame(this.animate);
    this.mixer?.update(1/60);
    if(this.renderer&&this.scene&&this.camera)this.renderer.render(this.scene,this.camera);
  };

  dispose(){
    this.disposed=true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.offs.forEach(off=>off());
    this.offs=[];
    this.renderer?.dispose();
    this.root.remove();
  }
}