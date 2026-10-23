import {type Building,type BuildingSpecification,type StructuralElement,type ElementType,type RoomPlan} from './model';

export function generateBuilding(input:BuildingSpecification):Building{
 const spec=structuredClone(input); spec.area=Math.max(300,Math.min(12000,Number(spec.area)||1500)); spec.floors=Math.max(1,Math.min(5,Math.round(spec.floors)||1));
 const area=spec.unit==='sq ft'?spec.area*.092903:spec.area;
 // Entered area is the total built area, split evenly between floors.
 const width=Math.sqrt(area/spec.floors*1.2),depth=width/1.2,dx=width/2,dz=depth/2;
 const elements:StructuralElement[]=[]; const counts:Record<string,number>={};
 const prefix:Record<ElementType,string>={foundation:'F',column:'C',beam:'B',slab:'S',wall:'W',roof:'R',window:'GL',door:'D',flooring:'FL',balcony:'BA'};
 const mat=spec.materials; const q=mat.quality/100; const strength=mat.concrete/25*q*(.6+.4*mat.storage/100)*(mat.steel==='Fe500'?1:.85)*(mat.cement==='OPC 53'?1:mat.cement==='OPC 43'?.94:.9);
 const add=(type:ElementType,floor:number,pos:[number,number,number],dims:[number,number,number],connections:string[],phase:number,capacity:number,weight:number,bay=-1)=>{
 const id=prefix[type]+(counts[type]=(counts[type]||0)+1);
 const e:StructuralElement={id,type,floor,position:pos,dimensions:dims,material:type==='wall'?mat.block:type==='window'?'Glass':`M${mat.concrete}`,quality:mat.quality,designCapacity:capacity,appliedLoad:0,utilization:0,health:100,connections,state:'SAFE',constructionState:'NOT_BUILT',phase,weight,bay}; elements.push(e);return id;
 };
 const foundations:string[]=[];let previous:string[]=[];
 for(let z=0;z<3;z++)for(let x=0;x<3;x++)foundations.push(add('foundation',0,[(x-1)*dx,-.35,(z-1)*dz],[1.15,.6,1.15],[],3,1400*q,20));
 for(let f=0;f<spec.floors;f++){
 const columns:string[]=[]; const y=f*3.2;
 for(let z=0;z<3;z++)for(let x=0;x<3;x++){let i=z*3+x;columns.push(add('column',f,[(x-1)*dx,y+1.5,(z-1)*dz],[mat.columnSize,3,mat.columnSize], [f===0?foundations[i]:previous[i]],4,950*strength*(mat.columnSize/.35)**2,9));}
 const horizontal:string[][]=[],vertical:string[][]=[];
 for(let z=0;z<3;z++){horizontal[z]=[];for(let x=0;x<2;x++)horizontal[z][x]=add('beam',f,[(x-.5)*dx,y+3,(z-1)*dz],[dx,.35,.28],[columns[z*3+x],columns[z*3+x+1]],5,850*strength,dx*2.5);}
 for(let z=0;z<2;z++){vertical[z]=[];for(let x=0;x<3;x++)vertical[z][x]=add('beam',f,[(x-1)*dx,y+3,(z-.5)*dz],[.28,.35,dz],[columns[z*3+x],columns[(z+1)*3+x]],5,850*strength,dz*2.5);}
 for(let z=0;z<2;z++)for(let x=0;x<2;x++){
 const bay=z*2+x,px=(x-.5)*dx,pz=(z-.5)*dz;
 const s=add('slab',f,[px,y+3.19,pz],[dx-.03,.18,dz-.03],[horizontal[z][x],horizontal[z+1][x],vertical[z][x],vertical[z][x+1]],6,1800*strength,dx*dz*4,bay);
 add('flooring',f,[px,y+.055,pz],[dx-.1,.08,dz-.1],f===0?foundations:[...previous],10,1e9,.1,bay);
 if(f===spec.floors-1)add('roof',f,[px,y+3.32,pz],[dx,.09,dz],[s],6,2200*strength,dx*dz*.8,bay);
 // Exterior walls include real openings assembled from sill, header and piers.
 const exterior=(axis:'x'|'z',side:number)=>{
 const span=axis==='x'?dx:dz; const cx=axis==='x'?px:side*width/2;const cz=axis==='x'?side*depth/2:pz;
 const piece=(offset:number,h:number,yy:number,len:number)=>add('wall',f,[cx+(axis==='x'?offset:0),y+yy,cz+(axis==='z'?offset:0)],axis==='x'?[len,h,.17]:[.17,h,len],[s],7,1e9,len*h*(mat.block==='AAC'?.65:1.25),bay);
 const opening=Math.min(1.7,span*.52);const pier=(span-opening)/2;
 piece(-(span+opening)/4,2.8,1.4,pier);piece((span+opening)/4,2.8,1.4,pier);piece(0,.5,2.55,opening);
 const isDoor=f===0&&axis==='x'&&side===1&&x===0;
 if(!isDoor)piece(0,.8,.4,opening);
 add(isDoor?'door':'window',f,[cx,y+(isDoor?1.15:1.55),cz],axis==='x'?[opening,isDoor?2.3:1.5,.09]:[.09,1.5,opening],[s],8,1e9,.2,bay);
 };
 if(z===0)exterior('x',-1);if(z===1)exterior('x',1);if(x===0)exterior('z',-1);if(x===1)exterior('z',1);
 }
 previous=columns;
 }
 const rooms:RoomPlan[]=[];
 for(let f=0;f<spec.floors;f++){
 const requests=spec.rooms.filter(r=>r.floor===f);const groups:Record<string,typeof requests>={};
 for(const r of requests){const key=r.location; (groups[key]??=[]).push(r);}
 for(const [location,rs] of Object.entries(groups))rs.forEach((r,i)=>{
 const right=location.includes('right'),left=location.includes('left');const front=location.includes('front'),rear=location.includes('rear');
 const zoneW=width/(left||right?2:3),zoneD=depth/3;const rw=zoneW/rs.length;
 const x=(left?-width/4:right?width/4:0)-zoneW/2+rw*(i+.5); const z=front?depth/3:rear?-depth/3:0;
 rooms.push({...r,x,z,width:rw,depth:zoneD});
 if(r.type==='Balcony'){const s=elements.find(e=>e.type==='slab'&&e.floor===f)!;add('balcony',f,[x,f*3.2+.1,depth/2+.65],[Math.min(rw,3),.16,1.3],[s.id],12,500*strength,10);}
 else{
 const supports=elements.filter(e=>e.type==='slab'&&e.floor===f).map(e=>e.id);
 add('wall',f,[x,f*3.2+1.35,z-zoneD/2],[Math.max(.2,rw-.8),2.7,.1],supports,7,1e9,rw*1.2);
 }
 });
 }
 const baseCost=area*(155+(mat.concrete-15)*2)*(0.7+q*.3)*(mat.block==='AAC'?1:1.06)*(mat.cement==='OPC 53'?1.06:1);
 return {spec,width,depth,rooms,elements,cost:baseCost,duration:Math.round(area/3+spec.floors*15)};
}
