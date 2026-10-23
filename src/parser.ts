import {type BuildingSpecification,roomTypes,type Location} from './model';
export interface PromptParser {parse(text:string,base:BuildingSpecification):{spec:BuildingSpecification; notes:string[]}}
export const localParser:PromptParser={parse(text,base){
 const spec=structuredClone(base),t=text.toLowerCase(),notes=['Local parser · review the fields before construction.'];
 const area=t.match(/([\d,]+)\s*(?:sq\.?\s*(ft|m)|square\s*(feet|meters|metres))/);if(area){spec.area=Number(area[1].replaceAll(',',''));spec.unit=['m','meters','metres'].includes(area[2]||area[3])?'sq m':'sq ft';}
 const g=t.match(/g\s*\+\s*(\d)/), floors=t.match(/(\d)\s*(?:floors?|stor(?:ey|y)s?)/);if(g)spec.floors=Math.min(5,+g[1]+1);else if(floors)spec.floors=Math.max(1,Math.min(5,+floors[1]));else if(t.includes('ground floor only'))spec.floors=1;
 const names:Record<string,string>={Bedroom:'bedrooms?',Bathroom:'bathrooms?',Washroom:'washrooms?',Kitchen:'kitchens?',Hall:'(?:halls?|living rooms?)',Dining:'dining rooms?',Study:'(?:stud(?:y|ies))',Balcony:'balcon(?:y|ies)',Store:'store rooms?',Utility:'utility rooms?'};
 for(const type of roomTypes){const re=new RegExp(`(?:(\\d+|a|an|one|two|three|four|five)\\s+)?(?:large\\s+)?${names[type]}`);const m=t.match(re);if(!m)continue;const n=m[1]?({a:1,an:1,one:1,two:2,three:3,four:4,five:5} as Record<string,number>)[m[1]]??+m[1]:1;
 spec.rooms=spec.rooms.filter(r=>r.type!==type);const context=t.slice(m.index!,m.index!+95).split(/,|\band\b/)[0];let location:Location=type==='Kitchen'?'rear-left':'front-left';for(const l of ['rear-right','rear-left','front-right','front-left','center','rear','front'] as Location[])if(context.includes(l)||context.includes(l.replace('-',' '))){location=l;break;}
 const upper=/first floor|upstairs/.test(context);for(let i=0;i<Math.min(12,n);i++)spec.rooms.push({id:`${type}-${i}`,type,floor:upper?Math.min(1,spec.floors-1):type==='Bedroom'?Math.min(spec.floors-1,Math.floor((i+1)/2)):type==='Balcony'?spec.floors-1:0,location});
 }
 spec.rooms.forEach(r=>r.floor=Math.min(r.floor,spec.floors-1));
 if(t.includes('white'))spec.finish.paint='#f4f2e9';if(t.includes('terracotta'))spec.finish.paint='#bd775c';if(t.includes('wood'))spec.finish.facade='Wood';if(t.includes('stone'))spec.finish.facade='Stone';if(/pitched|sloped/.test(t))spec.finish.roof='Pitched';
 const concrete=t.match(/m(15|20|25|30|35)/);if(concrete)spec.materials.concrete=+concrete[1];
 notes.push(`${spec.area} ${spec.unit} total · ${spec.floors} floors · ${spec.rooms.length} rooms/zones`);return {spec,notes};
}};
