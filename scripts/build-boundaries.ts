/**
 * Builds the lightweight state map used by the web app (no runtime map library, no tile server).
 * Source: DataMeet India `States/Admin2` (derived from Survey of India / Census 2011 boundaries; J&K and Ladakh
 * updated to the Survey of India map in 2021), CC BY 4.0. Pinned to one commit and verified by SHA-256.
 * Run: node --import tsx scripts/build-boundaries.ts
 */
import {mkdtemp,writeFile,readFile,mkdir,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {lcc} from '../packages/geo/lcc';
const COMMIT='2c0c306a0c786a83876065a62b7b82646d8a639d';
const files:Record<string,string>={
 'Admin2.shp':'b61ebc11a7487ce1c340d55fc9d0c1a2b63af1f73191fef691c11693c726130d','Admin2.dbf':'4ec2f9b83263c85781bc9abf0d281d441b5e02377be124bda6b5d87bd9dc4ccd',
 'Admin2.shx':'dc428a44ed20384b02c3c5971f2b200b15d429923b6cc770cae940d0af21016a','Admin2.prj':'a02a27b1d1982c8516d83398e85a3c8b1aef1713c13ef4d84d7bde17430c07c4'
};
// Source name → Paisa geography id. Every source feature must be mapped; unknown names fail the build.
export const stateIds:Record<string,string>={
 'Andaman & Nicobar':'andaman-nicobar','Andhra Pradesh':'andhra-pradesh','Arunachal Pradesh':'arunachal-pradesh','Assam':'assam','Bihar':'bihar','Chandigarh':'chandigarh','Chhattisgarh':'chhattisgarh',
 'Dadra and Nagar Haveli and Daman and Diu':'dnh-dd','Delhi':'delhi','Goa':'goa','Gujarat':'gujarat','Haryana':'haryana','Himachal Pradesh':'himachal-pradesh','Jammu & Kashmir':'jammu-kashmir',
 'Jharkhand':'jharkhand','Karnataka':'karnataka','Kerala':'kerala','Ladakh':'ladakh','Lakshadweep':'lakshadweep','Madhya Pradesh':'madhya-pradesh','Maharashtra':'maharashtra','Manipur':'manipur',
 'Meghalaya':'meghalaya','Mizoram':'mizoram','Nagaland':'nagaland','Odisha':'odisha','Puducherry':'puducherry','Punjab':'punjab','Rajasthan':'rajasthan','Sikkim':'sikkim','Tamil Nadu':'tamil-nadu',
 'Telangana':'telangana','Tripura':'tripura','Uttar Pradesh':'uttar-pradesh','Uttarakhand':'uttarakhand','West Bengal':'west-bengal'
};
// City markers projected in the same frame as the states.
const cities=[{id:'pune',lon:73.8567,lat:18.5204}];
// Reference points spread across India, used only to fit lat/lng → map coordinates for city dots.
const refs=[{id:'ref-srinagar',lon:74.7973,lat:34.0837},{id:'ref-chennai',lon:80.2707,lat:13.0827},{id:'ref-guwahati',lon:91.7362,lat:26.1445},{id:'ref-ahmedabad',lon:72.5714,lat:23.0225},{id:'ref-kanyakumari',lon:77.5385,lat:8.0883}];
const dir=await mkdtemp(path.join(os.tmpdir(),'paisa-geo-'));
try{
 for(const [name,hash] of Object.entries(files)){
  const response=await fetch(`https://raw.githubusercontent.com/datameet/maps/${COMMIT}/States/${name}`,{signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw new Error(`${name}: HTTP ${response.status}`);
  const raw=new Uint8Array(await response.arrayBuffer());
  if(createHash('sha256').update(raw).digest('hex')!==hash)throw new Error(`${name}: SHA-256 mismatch`);
  await writeFile(path.join(dir,name),raw);
 }
 await writeFile(path.join(dir,'cities.json'),JSON.stringify({type:'FeatureCollection',features:[...cities,...refs].map(c=>({type:'Feature',properties:{id:c.id},geometry:{type:'Point',coordinates:[c.lon,c.lat]}}))}));
 const out=path.join(dir,'out.svg');
 execFileSync(path.resolve('node_modules/.bin/mapshaper'),['-i',path.join(dir,'Admin2.shp'),path.join(dir,'cities.json'),'combine-files','-target','Admin2','-simplify','percentage=0.3%','keep-shapes',
  '-proj','+proj=lcc +lat_1=12 +lat_2=30 +lat_0=22 +lon_0=82 +datum=WGS84','target=*','-style','r=2','target=cities','-o',out,'format=svg','id-field=ST_NM,id','width=800','target=*'],{stdio:'pipe'});
 const svg=await readFile(out,'utf8');
 const viewBox=/viewBox="([^"]+)"/.exec(svg)?.[1];if(!viewBox)throw new Error('No viewBox');
 const attr=(tag:string,key:string)=>new RegExp(` ${key}="([^"]+)"`).exec(tag)?.[1]??'';
 const states=[...svg.matchAll(/<path [^>]+>/g)].map(([tag])=>[tag,attr(tag,'d'),attr(tag,'id'),attr(tag,'fill-rule')]).map(([,d,raw,rule])=>{const name=raw.replaceAll('&amp;','&');const id=stateIds[name];if(!id)throw new Error(`Unmapped state: ${name}`);return {id,name,d:d.replace(/(\d+\.\d)\d+/g,'$1'),...(rule?{rule}:{})};});
 if(states.length!==36)throw new Error(`Expected 36 states/UTs, found ${states.length}`);
 const points=[...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"[^>]*id="([^"]+)"/g)].map(([,x,y,id])=>({id,x:Number(x),y:Number(y)}));
 const refPts=points.filter(p=>p.id.startsWith('ref-'));if(points.length!==cities.length+refs.length)throw new Error('City markers missing');
 // Least-squares fit of x=s·X+tx, y=−s·Y+ty from the reference points; checked to within 0.5 map units.
 const pairs=refPts.map(p=>{const r=refs.find(x=>x.id===p.id)!;return {...lcc(r.lat,r.lon),u:p.x,v:p.y};});
 const k=pairs.length,mx=pairs.reduce((a,p)=>a+p.x,0)/k,my=pairs.reduce((a,p)=>a+p.y,0)/k,mu=pairs.reduce((a,p)=>a+p.u,0)/k,mv=pairs.reduce((a,p)=>a+p.v,0)/k;
 const sNum=pairs.reduce((a,p)=>a+(p.x-mx)*(p.u-mu)-(p.y-my)*(p.v-mv),0),sDen=pairs.reduce((a,p)=>a+(p.x-mx)**2+(p.y-my)**2,0);const sc=sNum/sDen;
 const projection={s:sc,tx:mu-sc*mx,ty:mv+sc*my};const err=Math.max(...pairs.map(p=>Math.hypot(sc*p.x+projection.tx-p.u,-sc*p.y+projection.ty-p.v)));
 if(err>0.5)throw new Error(`Projection fit error ${err.toFixed(2)} map units`);
 await mkdir('apps/web/public/geo',{recursive:true});
 await writeFile('apps/web/public/geo/india-states.json',JSON.stringify({viewBox,states,cities:points.filter(p=>!p.id.startsWith('ref-')),projection,attribution:'State boundaries: DataMeet India community (CC BY 4.0), derived from Survey of India / Census of India data. Simplified for display.',source:`https://github.com/datameet/maps/tree/${COMMIT}/States`}));
 console.log(`Wrote ${states.length} states/UTs; projection fit error ${err.toFixed(3)} map units.`);
}finally{await rm(dir,{recursive:true,force:true});}
