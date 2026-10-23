export const roomTypes = ['Bedroom','Bathroom','Washroom','Kitchen','Hall','Dining','Study','Balcony','Store','Utility'] as const;
export type RoomType = typeof roomTypes[number];
export type Location = 'front-left'|'front'|'front-right'|'center'|'rear-left'|'rear'|'rear-right';
export interface RoomRequest {id:string; type:RoomType; floor:number; location:Location}
export interface Materials {concrete:number; steel:'Fe415'|'Fe500'; cement:'PPC'|'OPC 43'|'OPC 53'; block:'Red brick'|'AAC'|'Fly ash'|'Concrete blocks'; quality:number; storage:number; columnSize:number}
export interface Finish {paint:string; interior:string; facade:'Plaster'|'Stone'|'Wood'|'Glass'; roof:'Flat'|'Pitched'; floor:'Terrazzo'|'Wood'|'Stone'; railing:'Glass'|'Steel'; window:'Dark'|'White'; door:'Oak'|'Charcoal'; ceiling:'White'|'Warm'; kitchen:'Oak'|'White'; bathroom:'Stone'|'Blue tile'}
export interface BuildingSpecification {area:number; unit:'sq ft'|'sq m'; floors:number; rooms:RoomRequest[]; materials:Materials; finish:Finish; architecturalStyle:string}
export type ElementType = 'foundation'|'column'|'beam'|'slab'|'wall'|'roof'|'window'|'door'|'flooring'|'balcony';
export type ConstructionState = 'NOT_BUILT'|'REINFORCEMENT'|'SHUTTERING'|'POURING'|'CURING'|'COMPLETED'|'DAMAGED'|'FAILED';
export type StructuralState = 'SAFE'|'NORMAL'|'HIGH_LOAD'|'CRITICAL'|'FAILED';
export interface StructuralElement {id:string; type:ElementType; floor:number; position:[number,number,number]; dimensions:[number,number,number]; material:string; quality:number; designCapacity:number; appliedLoad:number; utilization:number; health:number; connections:string[]; state:StructuralState; constructionState:ConstructionState; phase:number; weight:number; bay:number; failedAt?:number; failureReason?:string}
export interface RoomPlan extends RoomRequest {x:number; z:number; width:number; depth:number}
export interface Building {spec:BuildingSpecification; width:number; depth:number; rooms:RoomPlan[]; elements:StructuralElement[]; cost:number; duration:number}
export const phases=['Site preparation','Excavation','Foundation reinforcement','Concrete foundations','Columns','Beams','Slabs & roof','Walls','Doors & windows','Plaster','Flooring','Painting','Exterior & landscape','Construction complete'];
export const defaultSpec:BuildingSpecification={area:1500,unit:'sq ft',floors:2,architecturalStyle:'Modern',rooms:[{id:'r1',type:'Hall',floor:0,location:'front-left'},{id:'r2',type:'Kitchen',floor:0,location:'rear-left'},{id:'r3',type:'Bedroom',floor:0,location:'front-right'},{id:'r4',type:'Bedroom',floor:1,location:'front-left'},{id:'r5',type:'Bedroom',floor:1,location:'rear-right'},{id:'r6',type:'Bathroom',floor:0,location:'rear-right'},{id:'r7',type:'Bathroom',floor:1,location:'rear-left'},{id:'r8',type:'Balcony',floor:1,location:'front'}],materials:{concrete:25,steel:'Fe500',cement:'OPC 53',block:'AAC',quality:92,storage:95,columnSize:0.35},finish:{paint:'#ede9dd',interior:'#f3efe5',facade:'Wood',roof:'Flat',floor:'Terrazzo',railing:'Glass',window:'Dark',door:'Oak',ceiling:'White',kitchen:'Oak',bathroom:'Stone'}};
export function cloneSpec(){return structuredClone(defaultSpec)}
export const floorName=(f:number)=>f===0?'Ground':`Floor ${f}`;
export function category(u:number):StructuralState{return u>1?'FAILED':u>=.95?'CRITICAL':u>=.8?'HIGH_LOAD':u>=.6?'NORMAL':'SAFE'}
export const stateColors:Record<StructuralState,string>={SAFE:'#58a897',NORMAL:'#c6c86b',HIGH_LOAD:'#eea34e',CRITICAL:'#ed694e',FAILED:'#c84240'};
