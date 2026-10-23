import {category,type Building,type StructuralElement,type ConstructionState} from './model';
export function phaseProgress(e:StructuralElement,time:number){const start=e.phase+(e.phase>=4&&e.phase<=8?e.floor*.09:0);return Math.max(0,Math.min(1,(time-start)/.85));}
export function constructionState(p:number,failed:boolean):ConstructionState{return failed?'FAILED':p<=0?'NOT_BUILT':p<.22?'REINFORCEMENT':p<.42?'SHUTTERING':p<.75?'POURING':p<1?'CURING':'COMPLETED'}
export interface FailureRecord {demand:number; reason:string}
export interface SimulationResult {elements:StructuralElement[]; failures:string[]; records:Record<string,FailureRecord>; maxUtilization:number; health:number}
// kN game loads, tributary support distribution. No engineering design use.
export function simulate(building:Building,time:number,loads:Record<number,number>,previousFailures:Set<string>,weakened:Record<string,number>={},history:Record<string,FailureRecord>={}):SimulationResult{
 const records={...history};
 const failed=new Set(previousFailures),elements=building.elements.map(e=>({...e,connections:[...e.connections]}));
 const byId=new Map(elements.map(e=>[e.id,e])); const built=(e:StructuralElement)=>phaseProgress(e,time)>.72;
 const ordered:StructuralElement[]=[];const visited=new Set<string>();
 function visit(e:StructuralElement){if(visited.has(e.id))return;visited.add(e.id);e.connections.forEach(id=>{const s=byId.get(id);if(s)visit(s)});ordered.push(e)}elements.forEach(visit);ordered.reverse();
 // Each pass detaches failed supports, redistributes demand, then checks capacities.
 for(let pass=0;pass<elements.length;pass++){
 for(const e of elements){e.appliedLoad=built(e)&&!failed.has(e.id)?e.weight:0;e.designCapacity=building.elements.find(b=>b.id===e.id)!.designCapacity*(weakened[e.id]??1);}
 for(let f=0;f<building.spec.floors;f++){const point=elements.find(e=>e.type==='slab'&&e.floor===f&&e.bay===0&&built(e)&&!failed.has(e.id));if(point)point.appliedLoad+=(loads[f]||0)*9.81;}
 let changed=false;
 for(const e of ordered){if(!built(e)||failed.has(e.id))continue;const supports=e.connections.map(id=>byId.get(id)!).filter(s=>s&&built(s)&&!failed.has(s.id));
 // An element without any remaining required supports falls under its own dead load.
 if(e.connections.length&&supports.length===0){records[e.id]={demand:e.appliedLoad,reason:'All connected supports lost'};failed.add(e.id);changed=true;continue;}
 e.utilization=e.appliedLoad/e.designCapacity;
 if(e.utilization>1){records[e.id]={demand:e.appliedLoad,reason:'Demand exceeded simulated capacity'};failed.add(e.id);changed=true;}
 // Transfer the failing member's instantaneous demand during this pass.
 for(const support of supports)support.appliedLoad+=e.appliedLoad/supports.length;
 }
 if(!changed)break;
 }
 for(const e of elements){if(failed.has(e.id)){e.appliedLoad=records[e.id]?.demand??e.appliedLoad;e.failureReason=records[e.id]?.reason??'Support removed by demolition';}e.utilization=e.appliedLoad/e.designCapacity;e.state=failed.has(e.id)?'FAILED':category(e.utilization);e.health=failed.has(e.id)?0:Math.max(0,100-Math.max(0,e.utilization-.8)*100);e.constructionState=constructionState(phaseProgress(e,time),failed.has(e.id));}
 const structural=elements.filter(e=>['column','beam','slab','foundation'].includes(e.type));
 return {elements,failures:[...failed],records,maxUtilization:Math.max(0,...structural.filter(e=>e.state!=='FAILED').map(e=>e.utilization)),health:structural.reduce((n,e)=>n+e.health,0)/structural.length};
}
