import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import {type Building,type StructuralElement,stateColors} from './model';
import {phaseProgress} from './simulation';

export interface ViewProps {building:Building;elements:StructuralElement[];time:number;running:boolean;speed:number;structural:boolean;floor:number;camera:string;cameraTick:number;selected:string|null;before:boolean;loadPulse:number;onSelect:(id:string)=>void}
export default function Viewport(props:ViewProps){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{
 if(!host.current)return;const container=host.current;const building=props.building;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#dce4df');scene.fog=new THREE.Fog('#dce4df',65,160);
 const camera=new THREE.PerspectiveCamera(40,1,.1,250);const span=Math.max(building.width,building.depth,building.spec.floors*3.2);
 camera.position.set(span*1.65,span*1.45,span*1.8);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;container.appendChild(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,building.spec.floors*1.1,0);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=90;controls.maxPolarAngle=Math.PI*.49;
 scene.add(new THREE.HemisphereLight('#f6f6e7','#728578',2.5));const sun=new THREE.DirectionalLight('#fff3d6',3.3);sun.position.set(-12,28,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:1,far:90});sun.shadow.bias=-.0004;scene.add(sun);
 const materials:THREE.Material[]=[];const geometries:THREE.BufferGeometry[]=[];
 function mat(color:string,extras:THREE.MeshStandardMaterialParameters={}){const m=new THREE.MeshStandardMaterial({color,roughness:.8,...extras});materials.push(m);return m;}
 function box(size:number[],pos:number[],color:string,parent:THREE.Object3D=scene,extras:THREE.MeshStandardMaterialParameters={}){const g=new THREE.BoxGeometry(...size as [number,number,number]);geometries.push(g);const mesh=new THREE.Mesh(g,mat(color,extras));mesh.position.set(...pos as [number,number,number]);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 const ground=box([170,.15,170],[0,-.86,0],'#b8c5b0');ground.castShadow=false;
 box([building.width+8,.2,building.depth+8],[0,-.7,0],'#d7c7ac');
 const grid=new THREE.GridHelper(100,50,'#94a899','#aebca9');grid.position.y=-.77;scene.add(grid);
 const street=box([170,.04,5],[0,-.72,building.depth/2+9],'#8c9991');street.castShadow=false;
 for(let i=-70;i<70;i+=5)box([2,.01,.07],[i,-.69,building.depth/2+9],'#dadbc3');
 const plan=new THREE.Group();scene.add(plan);
 for(const e of building.elements.filter(e=>e.type==='foundation')){const line=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.3,.015,1.3)),new THREE.LineBasicMaterial({color:'#558b83'}));line.position.set(e.position[0],.02,e.position[2]);plan.add(line);}
 const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(building.width,.015,building.depth)),new THREE.LineBasicMaterial({color:'#558b83'}));outline.position.y=.015;plan.add(outline);
 const excavations=new THREE.Group();scene.add(excavations);for(const e of building.elements.filter(e=>e.type==='foundation'))box([1.5,.06,1.5],[e.position[0],-.57,e.position[2]],'#685344',excavations);
 const meshes=new Map<string,THREE.Mesh>(),cages=new Map<string,THREE.LineSegments>(),forms=new Map<string,THREE.Mesh>(),cracks=new Map<string,THREE.Line>();
 for(const e of building.elements){
 const mesh=box(e.dimensions,e.position,'#bdbdaf');mesh.userData.id=e.id;meshes.set(e.id,mesh);
 if(e.type==='column'||e.type==='wall'){const [w,h,d]=e.dimensions;const points=[new THREE.Vector3(-w*.15,h*.35,d/2+.006),new THREE.Vector3(w*.18,h*.16,d/2+.006),new THREE.Vector3(-w*.25,0,d/2+.006),new THREE.Vector3(w*.2,-h*.25,d/2+.006)];const crack=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#2f332d'}));mesh.add(crack);cracks.set(e.id,crack);}
 if(['column','beam','foundation','slab'].includes(e.type)){
 const points:number[]=[];const [w,h,d]=e.dimensions;
 for(let yy=-h/2;yy<=h/2;yy+=Math.max(.22,h/12)){points.push(-w/2,yy,-d/2,w/2,yy,-d/2,w/2,yy,-d/2,w/2,yy,d/2,w/2,yy,d/2,-w/2,yy,d/2,-w/2,yy,d/2,-w/2,yy,-d/2);}
 for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])points.push(x,-h/2,z,x,h/2,z);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 const edges=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#595954'}));edges.position.copy(mesh.position);edges.scale.setScalar(.88);scene.add(edges);cages.set(e.id,edges);
 if(e.type==='column'||e.type==='beam'){const form=box(e.dimensions.map(v=>v+.08),e.position,'#b2874d',scene,{transparent:true,opacity:.58});forms.set(e.id,form);}
 }
 }
 const decor=new THREE.Group();scene.add(decor);
 box([3,.06,5],[0,-.48,building.depth/2+2.6],'#d2d0bd',decor);
 for(const x of [-1,1]){box([.14,.6,building.depth+6],[x*(building.width/2+3),-.18,0],'#a9a79a',decor);for(let i=0;i<4;i++){const px=x*(building.width/2+2.3),pz=(i-1.5)*2.6;box([.65,.5,.65],[px,-.22,pz],'#aaa18a',decor);const shrub=new THREE.Mesh(new THREE.IcosahedronGeometry(.55,1),mat('#6b8951'));shrub.position.set(px,.38,pz);shrub.castShadow=true;decor.add(shrub);}}
 const facade=new THREE.Group();scene.add(facade);
 for(let f=0;f<building.spec.floors;f++){
 const surface=building.spec.finish.facade;
 for(const side of [-1,1]){for(let i=0;i<5;i++)box([surface==='Wood'?.065:.13,2.75,.15],[side*(building.width/2-.55)+i*.13,f*3.2+1.4,building.depth/2+.13],surface==='Wood'?'#8b694a':surface==='Stone'?'#8c9489':surface==='Glass'?'#709b9d':building.spec.finish.paint,facade,{transparent:surface==='Glass',opacity:surface==='Glass'?.6:1});}
 for(const side of [-1,1]){box([.18,.28,.16],[side*(building.width/2-.8),f*3.2+2.2,building.depth/2+.13],'#454e40',facade);box([.13,.18,.02],[side*(building.width/2-.8),f*3.2+2.2,building.depth/2+.22],'#fff1ad',facade,{emissive:'#e6c16c',emissiveIntensity:.9});}
 box([building.width+.35,.12,.3],[0,f*3.2+3.25,building.depth/2+.17],'#464e46',facade);
 for(const e of building.elements.filter(e=>e.type==='window'&&e.floor===f)){const w=e.dimensions;const frame=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w[0]+.08,w[1]+.08,w[2]+.035)),new THREE.LineBasicMaterial({color:building.spec.finish.window==='Dark'?'#303f3a':'#f4f4e9'}));frame.position.set(...e.position);facade.add(frame);}
 }
 for(const e of building.elements.filter(e=>e.type==='balcony')){
 const glass=building.spec.finish.railing==='Glass';box([e.dimensions[0],.85,.05],[e.position[0],e.position[1]+.55,e.position[2]+.62],glass?'#adc7c4':'#454f48',facade,{transparent:glass,opacity:glass?.55:1});box([e.dimensions[0],.045,.08],[e.position[0],e.position[1]+1,e.position[2]+.62],'#45534c',facade);
 }
 const pitched=new THREE.Group();scene.add(pitched);for(const side of [-1,1]){const roof=box([building.width/2+.35,.15,building.depth+.6],[side*building.width/4,building.spec.floors*3.2+building.width*.09,0],'#4d5c54',pitched);roof.rotation.z=side*-.34;}
 const interiors=new THREE.Group();scene.add(interiors);
 for(const r of building.rooms){if(r.type==='Balcony')continue;const y=r.floor*3.2+.13;const group=new THREE.Group();interiors.add(group);group.userData.floor=r.floor;
 const ceiling=box([Math.max(.1,r.width-.08),.035,Math.max(.1,r.depth-.08)],[r.x,r.floor*3.2+2.97,r.z],building.spec.finish.ceiling==='White'?'#f4f2e9':'#d8c9a5',group);ceiling.userData.ceiling=true;
 if(r.type==='Bedroom'){box([Math.min(1.5,r.width*.75),.4,1.9],[r.x,y+.2,r.z],'#bca784',group);box([Math.min(1.4,r.width*.7),.12,1.7],[r.x,y+.46,r.z],'#efebe0',group);}
 if(r.type==='Kitchen'){box([Math.max(.4,r.width-.3),.85,.55],[r.x,y+.42,r.z-r.depth/3],building.spec.finish.kitchen==='Oak'?'#a4825c':'#e5e6db',group);box([Math.max(.4,r.width-.2),.07,.6],[r.x,y+.9,r.z-r.depth/3],'#666e65',group);}
 if(r.type==='Hall'||r.type==='Study'){box([Math.min(1.9,r.width*.7),.5,.7],[r.x,y+.3,r.z],'#8b9b83',group);box([.75,.32,.6],[r.x,y+.16,r.z+.8],'#aa8866',group);}
 if(r.type==='Bathroom'||r.type==='Washroom'){box([.65,.45,1.15],[r.x,y+.23,r.z],building.spec.finish.bathroom==='Stone'?'#d5d6ca':'#8eaeb6',group);}
 }
 // Low-poly construction crew, articulated limbs and stage-specific tools.
 const equipment=new THREE.Group();scene.add(equipment);const workers:{root:THREE.Group;arm:THREE.Group;legs:THREE.Mesh[];tool:THREE.Mesh}[]=[];
 for(let i=0;i<5;i++){const root=new THREE.Group();equipment.add(root);box([.32,.5,.22],[0,.84,0],i%2?'#dfb945':'#e38a41',root);box([.24,.24,.24],[0,1.23,0],'#bd9170',root);box([.31,.1,.31],[0,1.39,0],'#efd15d',root);const legs=[-.1,.1].map(x=>box([.12,.55,.13],[x,.3,0],'#44575a',root));const arm=new THREE.Group();arm.position.set(.24,1,0);root.add(arm);box([.1,.45,.1],[0,-.2,0],'#ba9070',arm);const tool=box([.07,.75,.07],[0,-.48,.05],'#77684d',arm);workers.push({root,arm,legs,tool});}
 const excavator=new THREE.Group();equipment.add(excavator);excavator.position.set(-building.width/2-2.2,-.45,1);box([1.6,.3,2.2],[0,.2,0],'#36433d',excavator);box([1.5,.6,1.6],[0,.65,0],'#d9ac45',excavator);box([.9,.8,.8],[.1,1.2,-.3],'#596c65',excavator);const boom=new THREE.Group();boom.position.set(0,1,.5);excavator.add(boom);box([.22,1.8,.24],[0,.75,.35],'#dfaf40',boom).rotation.x=.5;box([.7,.3,.6],[0,1.45,1.1],'#6a6850',boom);
 const truck=new THREE.Group();equipment.add(truck);truck.position.set(building.width/2+2,-.42,2);box([1.5,.7,2.5],[0,.8,0],'#bac3b3',truck);box([1.5,1.2,1],[0,1,1.7],'#d5a846',truck);for(const x of [-.8,.8])for(const z of [-.8,1.2])box([.3,.65,.65],[x,.35,z],'#34423d',truck);
 const mixer=new THREE.Mesh(new THREE.CylinderGeometry(.65,.65,1.65,12),mat('#e7ddc7'));mixer.rotation.x=Math.PI/2;mixer.position.set(0,1.45,0);truck.add(mixer);
 const pump=box([.12,3,.12],[building.width/2+1.4,1.8,0],'#d6b14a',equipment);pump.rotation.z=.6;
 const crane=new THREE.Group();equipment.add(crane);crane.position.set(-building.width/2-3,0,-building.depth/2-2);const ch=building.spec.floors*3.2+3;box([.4,ch,.4],[0,ch/2,0],'#b7a061',crane);const jib=box([building.width+4,.2,.2],[2,ch,0],'#c9af63',crane);const rope=box([.025,ch*.5,.025],[4,ch*.75,0],'#737566',crane);
 const selection=new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(1,1,1)),'#f7e5a1');scene.add(selection);
 const flow=new THREE.Group();scene.add(flow);const dots:THREE.Mesh[]=[];for(let i=0;i<18;i++){const dot=new THREE.Mesh(new THREE.SphereGeometry(.07,8,8),new THREE.MeshBasicMaterial({color:'#ffc766'}));flow.add(dot);dots.push(dot);}
 const world=new CANNON.World({gravity:new CANNON.Vec3(0,-9.82,0)});world.broadphase=new CANNON.SAPBroadphase(world);world.defaultContactMaterial.friction=.65;world.defaultContactMaterial.restitution=.08;
 const groundBody=new CANNON.Body({mass:0,shape:new CANNON.Plane()});groundBody.quaternion.setFromEuler(-Math.PI/2,0,0);groundBody.position.y=-.55;world.addBody(groundBody);
 const bodies=new Map<string,{body:CANNON.Body;mesh:THREE.Mesh}[]>();const fixedBodies=new Map<string,CANNON.Body>();const failureTime=new Map<string,number>();let wallClock=0,workClock=0,lastCamera=-1,frame=0,last=performance.now(),down={x:0,y:0};
 function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}const observer=new ResizeObserver(resize);observer.observe(container);resize();
 const onDown=(ev:PointerEvent)=>{down={x:ev.clientX,y:ev.clientY}};
 const ray=new THREE.Raycaster();const onClick=(ev:PointerEvent)=>{if(Math.hypot(ev.clientX-down.x,ev.clientY-down.y)>5)return;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((ev.clientX-r.left)/r.width*2-1,-(ev.clientY-r.top)/r.height*2+1),camera);const hits=ray.intersectObjects([...meshes.values(),...[...bodies.values()].flat().map(p=>p.mesh)].filter(m=>m.visible),false);if(hits[0])latest.current.onSelect(hits[0].object.userData.id)};
 renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointerup',onClick);
 function animate(now:number){frame=requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;const p=latest.current;wallClock+=dt;
 if(p.cameraTick!==lastCamera){lastCamera=p.cameraTick;const h=building.spec.floors*1.4;controls.target.set(0,h,0);const d=span*2.2;const positions:Record<string,number[]>={Orbit:[d*.75,d*.65,d*.9],Front:[0,h+3,d],Rear:[0,h+3,-d],Left:[-d,h+3,0],Right:[d,h+3,0],Top:[.01,d*1.3,.01],Structural:[d*.7,d*.6,d*.8],Interior:[building.width*.15,2,building.depth*.22]};camera.position.set(...(positions[p.camera]||positions.Orbit) as [number,number,number]);if(p.camera==='Interior')controls.target.set(0,1.4,-building.depth/2);}
 controls.autoRotate=p.time>=13&&!p.structural&&!p.before&&p.camera==='Orbit';controls.autoRotateSpeed=.5;controls.update();
 plan.visible=p.time<1&&!p.before;excavations.visible=p.time>=1&&p.time<4&&!p.before;excavations.children.forEach(hole=>hole.scale.setScalar(Math.max(.01,Math.min(1,p.time-1))));decor.visible=p.time>=12&&!p.before;facade.visible=p.time>=12&&!p.before&&!p.structural;facade.children.forEach(c=>c.visible=(p.floor<0||c.position.y<(p.floor+1)*3.2)&&!p.elements.some(e=>e.state==='FAILED'&&e.floor===Math.floor(c.position.y/3.2)));
 pitched.visible=facade.visible&&building.spec.finish.roof==='Pitched'&&p.floor<0&&!p.elements.some(e=>e.state==='FAILED');interiors.visible=p.time>=10&&!p.before&&!p.structural;interiors.children.forEach(g=>{g.visible=(p.floor<0||g.userData.floor<=p.floor)&&!p.elements.some(e=>e.type==='slab'&&e.floor===g.userData.floor&&e.state==='FAILED');g.children.forEach(c=>{if(c.userData.ceiling)c.visible=p.floor<0;});});
 equipment.visible=p.time>0&&p.time<13&&!p.before;crane.visible=building.spec.floors>1;excavator.visible=p.time<4;truck.visible=p.time>=3&&p.time<9;pump.visible=p.time>=3&&p.time<7;
 if(p.running)workClock+=dt*p.speed;const active=workClock;boom.rotation.x=Math.sin(active*1.5)*.4-.7;mixer.rotation.z=active*2;jib.rotation.y=Math.sin(active*.2)*.18;rope.position.y=ch*.7+Math.sin(active)*.5;
 workers.forEach((w,i)=>{const a=active*.3+i*1.25;w.root.position.set(Math.cos(a)*(building.width/2+1),-.48,Math.sin(a)*(building.depth/2+1));w.root.rotation.y=-a;w.arm.rotation.x=Math.sin(active*5+i)*(.6+(p.time<3?.4:0));w.legs.forEach((l,j)=>l.rotation.x=Math.sin(active*6+i+j*Math.PI)*.35);w.tool.scale.set(p.time>=7&&p.time<9?3:1,p.time>=11?.6:1,1);});
 for(const e of p.elements){const mesh=meshes.get(e.id)!;const progress=phaseProgress(e,p.time);const failed=e.state==='FAILED';let visible=progress>0&&!p.before&&(p.floor<0||e.floor<=p.floor);if(p.structural&&!['foundation','column','beam','slab','roof'].includes(e.type))visible=false;
 if(p.floor>=0&&(e.type==='slab'||e.type==='roof')&&e.floor===p.floor)visible=false;
 mesh.visible=visible;const m=mesh.material as THREE.MeshStandardMaterial;
 let color='#bcbdb0';if(e.type==='wall')color=p.time>=11?building.spec.finish.paint:p.time>=9?'#d9d5c6':building.spec.materials.block==='Red brick'?'#b16d4d':'#c9c7b6';if(e.type==='window')color='#7caaa9';if(e.type==='door')color=building.spec.finish.door==='Oak'?'#8d6844':'#3c4843';if(e.type==='flooring')color=building.spec.finish.floor==='Wood'?'#ab8c62':building.spec.finish.floor==='Stone'?'#92988c':'#d9d4be';if(e.type==='roof')color='#acb4a5';
 m.color.set(p.structural?stateColors[e.state]:failed?'#8a7461':color);
 if(e.type==='wall'&&!p.structural&&!failed){const interior=e.dimensions[2]===.1;const brick=building.spec.materials.block==='Red brick'?'#b16d4d':'#c9c7b6';m.color.set(brick).lerp(new THREE.Color('#d9d5c6'),Math.max(0,Math.min(1,(p.time-9)/.85))).lerp(new THREE.Color(interior?building.spec.finish.interior:building.spec.finish.paint),Math.max(0,Math.min(1,(p.time-11)/.85)));}
 m.transparent=e.type==='window'||(p.structural&&(e.type==='slab'||e.type==='roof'));m.opacity=e.type==='window'?.62:p.structural&&(e.type==='slab'||e.type==='roof')?.3:1;
 m.emissive.set(e.id===p.selected?'#a57c22':'#000000');m.emissiveIntensity=.2;
 const crack=cracks.get(e.id);if(crack)crack.visible=failed;
 const cage=cages.get(e.id);if(cage){cage.visible=!p.before&&!failed&&(e.type==='foundation'?p.time>=2&&p.time<3.6:visible&&progress<.6);if(e.type==='foundation')cage.scale.y=Math.max(.01,Math.min(.88,(p.time-2)*.88));}const form=forms.get(e.id);if(form)form.visible=visible&&progress>.22&&progress<.65&&!failed;
 if(p.elements.some(el=>el.state==='FAILED')&&progress>=1&&!failed&&!fixedBodies.has(e.id)&&['column','beam','slab','foundation'].includes(e.type)){const d=e.dimensions;const fixed=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(d[0]/2,d[1]/2,d[2]/2)),position:new CANNON.Vec3(...e.position)});world.addBody(fixed);fixedBodies.set(e.id,fixed);}
 if(failed&&fixedBodies.has(e.id)){world.removeBody(fixedBodies.get(e.id)!);fixedBodies.delete(e.id);}
 if(failed&&visible&&!failureTime.has(e.id))failureTime.set(e.id,wallClock);
 if(failed&&failureTime.has(e.id)&&!bodies.has(e.id)&&wallClock-failureTime.get(e.id)!>(e.type==='column'?.1:e.type==='beam'?.4:.75)){
 const dims=e.dimensions,flat=e.type==='slab'||e.type==='roof';const nx=flat?3:e.type==='beam'&&dims[0]>dims[2]?3:1,ny=e.type==='column'?3:1,nz=flat?3:e.type==='beam'&&dims[2]>dims[0]?3:1;const pieces:{body:CANNON.Body;mesh:THREE.Mesh}[]=[];
 for(let ix=0;ix<nx;ix++)for(let iy=0;iy<ny;iy++)for(let iz=0;iz<nz;iz++){
 const size:[number,number,number]=[dims[0]/nx*.87,dims[1]/ny*.92,dims[2]/nz*.87];const position:[number,number,number]=[e.position[0]+((ix+.5)/nx-.5)*dims[0],e.position[1]+((iy+.5)/ny-.5)*dims[1],e.position[2]+((iz+.5)/nz-.5)*dims[2]];
 const body=new CANNON.Body({mass:Math.max(8,size[0]*size[1]*size[2]*150),shape:new CANNON.Box(new CANNON.Vec3(size[0]/2,size[1]/2,size[2]/2)),position:new CANNON.Vec3(...position),linearDamping:.15,angularDamping:.3});body.angularVelocity.set(.25+(ix%2)*.2,0,.2+(iz%2)*.2);world.addBody(body);const fragment=box(size,position,p.structural?stateColors.FAILED:'#8a7461');fragment.userData.id=e.id;pieces.push({body,mesh:fragment});
 }bodies.set(e.id,pieces);
 }
 const pieces=bodies.get(e.id);if(pieces){mesh.visible=false;for(const part of pieces){part.mesh.visible=visible;part.mesh.position.copy(part.body.position as unknown as THREE.Vector3);part.mesh.quaternion.copy(part.body.quaternion as unknown as THREE.Quaternion);(part.mesh.material as THREE.MeshStandardMaterial).color.set(p.structural?stateColors.FAILED:'#8a7461');}}else{mesh.position.set(...e.position);mesh.quaternion.identity();mesh.scale.set(e.type==='flooring'?Math.max(.001,progress):1,e.type==='flooring'?1:Math.max(.001,progress),1);mesh.position.y=e.position[1]-e.dimensions[1]*(1-progress)/2;}
 }
 if(bodies.size)world.step(1/60,dt,3);
 const selected=p.selected?(bodies.get(p.selected)?.[0].mesh??meshes.get(p.selected)):undefined;selection.visible=!!selected?.visible;if(selected?.visible)selection.setFromObject(selected);
 flow.visible=p.loadPulse>0&&!p.before;dots.forEach((d,i)=>{const e=p.elements.filter(e=>e.type==='column')[i%Math.max(1,building.spec.floors*9)];if(e){d.position.set(e.position[0]+.22,(wallClock* -2+i*.65+100)%Math.max(3,building.spec.floors*3.2),e.position[2]+.22);}});
 renderer.render(scene,camera);
 }frame=requestAnimationFrame(animate);
 return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',onDown);renderer.domElement.removeEventListener('pointerup',onClick);scene.traverse(obj=>{if(obj instanceof THREE.Mesh||obj instanceof THREE.LineSegments){obj.geometry.dispose();const ms=Array.isArray(obj.material)?obj.material:[obj.material];ms.forEach(m=>m.dispose());}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
 },[props.building]);
 return <div ref={host} className="viewport" aria-label="Interactive 3D construction site"/>;
}
