'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Minus,Plus,LocateFixed} from 'lucide-react';
import {asset} from '../lib/static-data';
import {toMap} from '../../../packages/geo/lcc';
export type CityDot={id:string;label:string;lat:number;lng:number;size:number;hasData:boolean};
type MapData={viewBox:string;states:{id:string;name:string;d:string;rule?:string}[];projection:{s:number;tx:number;ty:number};attribution:string;source:string};
type View={k:number;x:number;y:number};
let cache:Promise<MapData>|null=null;
const load=()=>cache??=fetch(asset('/geo/india-states.json')).then(r=>{if(!r.ok)throw new Error('Map unavailable');return r.json();});
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
/**
 * Pre-projected SVG map with free zoom/pan (wheel, drag, pinch, buttons) and animated fly-to for the focused state or city.
 * Shading shows data coverage only, never a judgement.
 */
export default function IndiaMap({state,city,connected,labels,dots,onState,onCity,onBack,hi}:{state:string|null;city:string|null;connected:Set<string>;labels:Record<string,string>;dots:CityDot[];onState:(id:string)=>void;onCity:(id:string)=>void;onBack:()=>void;hi:boolean}){
 const [data,setData]=useState<MapData|null>(null),[failed,setFailed]=useState(false);
 const [view,setView]=useState<View>({k:1,x:0,y:0}),[animate,setAnimate]=useState(true),[tip,setTip]=useState<{text:string;x:number;y:number}|null>(null);
 const svg=useRef<SVGSVGElement>(null),refs=useRef<Record<string,SVGPathElement|null>>({});
 const drag=useRef<{pointers:Map<number,{x:number;y:number}>;moved:boolean;start?:View;dist?:number}>({pointers:new Map(),moved:false});
 useEffect(()=>{load().then(setData,()=>setFailed(true));},[]);
 const size=()=>{const [,,w,h]=(data?.viewBox??'0 0 800 915').split(' ').map(Number);return {w,h};};
 const fly=useCallback((target:View)=>{setAnimate(true);setView(target);},[]);
 // Visible map area in SVG units, excluding the floating info card on wide screens.
 const visible=()=>{const el=svg.current;if(!el)return null;const r=el.getBoundingClientRect();const inset=window.matchMedia('(min-width:1001px)').matches?412:0;const a=toSvg(r.left,r.top+60),b=toSvg(r.right-inset,r.bottom-50);return {cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,w:b.x-a.x,h:b.y-a.y};};
 const fit=(bx:number,by:number,bw:number,bh:number,max:number)=>{const v=visible();if(!v)return;const k=clamp(0.85*Math.min(v.w/bw,v.h/bh),0.5,max);fly({k,x:v.cx-k*(bx+bw/2),y:v.cy-k*(by+bh/2)});};
 // Fly to the focused city (keeping its state in view), else the focused state, else all of India.
 const [tick,setTick]=useState(0);
 useEffect(()=>{const onResize=()=>setTick(n=>n+1);window.addEventListener('resize',onResize);return()=>window.removeEventListener('resize',onResize);},[]);
 useEffect(()=>{
  if(!data)return;const {w,h}=size();const el=state?refs.current[state]:null;const d=city?dots.find(x=>x.id===city):null;const c=d?toMap(d.lat,d.lng,data.projection):null;
  if(c&&el){const b=el.getBBox();const s=Math.max(b.width,b.height)*0.7;fit(c.x-s/2,c.y-s/2,s,s,16);return;}
  if(el){const b=el.getBBox();fit(b.x,b.y,b.width,b.height,12);return;}
  fit(0,0,w,h,1.5);
 },[data,state,city,tick,dots.length]); // Refit when focus, data, dots or window size change.
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')onBack();};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[onBack]);
 // Screen pixels → SVG user units.
 const toSvg=(clientX:number,clientY:number)=>{const m=svg.current?.getScreenCTM();if(!m)return {x:0,y:0};const p=new DOMPoint(clientX,clientY).matrixTransform(m.inverse());return {x:p.x,y:p.y};};
 const zoomAt=(px:number,py:number,factor:number,base=view)=>{const k=clamp(base.k*factor,0.5,40);return {k,x:px-(px-base.x)*k/base.k,y:py-(py-base.y)*k/base.k};};
 useEffect(()=>{const el=svg.current;if(!el)return;const onWheel=(e:WheelEvent)=>{e.preventDefault();const p=toSvg(e.clientX,e.clientY);setAnimate(false);setView(v=>zoomAt(p.x,p.y,Math.exp(-e.deltaY*0.0018),v));};el.addEventListener('wheel',onWheel,{passive:false});return()=>el.removeEventListener('wheel',onWheel);});
 const down=(e:React.PointerEvent)=>{drag.current.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag.current.moved=false;drag.current.start=view;if(drag.current.pointers.size===2){const [a,b]=[...drag.current.pointers.values()];drag.current.dist=Math.hypot(a.x-b.x,a.y-b.y);}};
 const move=(e:React.PointerEvent)=>{
  const d=drag.current;const prev=d.pointers.get(e.pointerId);
  if(!prev){if(e.pointerType==='mouse'){const target=(e.target as Element).closest('[data-name]');setTip(target?{text:target.getAttribute('data-name')!,x:e.clientX,y:e.clientY}:null);}return;}
  d.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(d.pointers.size===2&&d.dist&&d.start){const [a,b]=[...d.pointers.values()];const mid=toSvg((a.x+b.x)/2,(a.y+b.y)/2);d.moved=true;setAnimate(false);setView(zoomAt(mid.x,mid.y,Math.hypot(a.x-b.x,a.y-b.y)/d.dist,d.start));return;}
  const m=svg.current?.getScreenCTM();if(!m)return;const dx=(e.clientX-prev.x)/m.a,dy=(e.clientY-prev.y)/m.d;
  if(!d.moved&&Math.abs(e.clientX-prev.x)+Math.abs(e.clientY-prev.y)<3)return;
  if(!d.moved)svg.current?.setPointerCapture(e.pointerId);
  d.moved=true;setAnimate(false);setTip(null);setView(v=>({...v,x:v.x+dx,y:v.y+dy}));
 };
 const up=(e:React.PointerEvent)=>{drag.current.pointers.delete(e.pointerId);if(drag.current.pointers.size<2)drag.current.dist=undefined;};
 const activate=(fn:()=>void)=>()=>{if(drag.current.moved){drag.current.moved=false;return;}fn();};
 const key=(fn:()=>void)=>(e:React.KeyboardEvent)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}};
 const zoomButton=(f:number)=>{const {w,h}=size();fly(zoomAt(w/2,h/2,f));};
 if(failed)return <p className="map-fallback">{hi?'नक्शा लोड नहीं हुआ। सूची से राज्य चुनें।':'The map could not load. Choose a state from the list.'}</p>;
 if(!data)return <div className="map-loading" aria-hidden="true"/>;
 const status=(id:string)=>connected.has(id)?(hi?'डेटा जुड़ा है':'data connected'):(hi?'डेटा अभी नहीं जुड़ा':'no data connected yet');
 return <div className="map-stage">
  <svg ref={svg} viewBox={data.viewBox} role="group" aria-label={hi?'भारत का नक्शा। राज्य या शहर चुनें।':'Map of India. Choose a state or city.'} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={()=>setTip(null)}>
   <g className={`map-zoom ${animate?'animate':''}`} style={{transform:`translate(${view.x}px,${view.y}px) scale(${view.k})`}}>
    {data.states.map(s=><path key={s.id} ref={el=>{refs.current[s.id]=el;}} d={s.d} fillRule={s.rule as 'evenodd'|undefined} fill={state===s.id?'#2f7a64':connected.has(s.id)?'#9cc3ad':'#dfe7d9'} stroke="#ffffff" strokeWidth={0.7} data-name={`${labels[s.id]??s.name} · ${status(s.id)}`}
     className={`state ${connected.has(s.id)?'connected':''} ${state===s.id?'selected':''} ${state&&state!==s.id?'dim':''}`}
     role="button" tabIndex={0} aria-pressed={state===s.id} aria-label={`${labels[s.id]??s.name}: ${status(s.id)}`} onClick={activate(()=>onState(s.id))} onKeyDown={key(()=>onState(s.id))}/>)}
    {[...dots].sort((a,b)=>(a.id===city?1:0)-(b.id===city?1:0)||b.size-a.size).map(c=>{const p=toMap(c.lat,c.lng,data.projection);const sel=city===c.id;const r=(1.6+3.4*c.size)/view.k;
     return <g key={c.id} className={`city ${sel?'selected':''} ${c.hasData?'':'nodata'}`} data-name={`${c.label}${c.hasData?'':hi?' · डेटा नहीं':' · no accounts'}`} role="button" tabIndex={0} aria-label={`${c.label}: ${c.hasData?(hi?'शहर का पैसा देखें':'see city money'):(hi?'खाते उपलब्ध नहीं':'no accounts available')}`} onClick={activate(()=>onCity(c.id))} onKeyDown={key(()=>onCity(c.id))}>
      {sel&&<circle cx={p.x} cy={p.y} r={r*2.6} className="pulse" fill="#d98a2b55"/>}<circle cx={p.x} cy={p.y} r={sel?r*1.4:r} className="dot" fill={c.hasData?'#d98a2b':'#b9c2b4'} stroke="#ffffff" strokeWidth={0.6/view.k}/>
      {(sel||(view.k>2.2&&c.size>0.62)||view.k>7)&&<text x={p.x+r+2/view.k} y={p.y+3.5/view.k} style={{fontSize:`${11/view.k}px`,strokeWidth:`${2.2/view.k}px`}}>{c.label}</text>}</g>;})}
   </g>
  </svg>
  {tip&&<div className="map-tip" style={{left:tip.x,top:tip.y}}>{tip.text}</div>}
  <div className="map-controls"><button onClick={()=>zoomButton(1.6)} aria-label={hi?'ज़ूम इन':'Zoom in'}><Plus size={17}/></button><button onClick={()=>zoomButton(1/1.6)} aria-label={hi?'ज़ूम आउट':'Zoom out'}><Minus size={17}/></button><button onClick={()=>{if(!state&&!city){const {w,h}=size();fit(0,0,w,h,1.5);}else onBack();}} aria-label={hi?'पीछे / पूरा भारत':'Back / whole India'}><LocateFixed size={17}/></button></div>
  <div className="map-legend"><span><i className="swatch connected"/>{hi?'डेटा जुड़ा':'Data connected'}</span><span><i className="swatch"/>{hi?'अभी नहीं':'Not yet'}</span><span><i className="swatch city"/>{hi?'शहर':'City'}</span><a href={data.source} target="_blank" rel="noreferrer">{hi?'सीमाएं: DataMeet (CC BY 4.0)':'Boundaries: DataMeet (CC BY 4.0)'}</a></div>
 </div>;
}
