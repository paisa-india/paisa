'use client';
import {useRef,type ReactNode,type PointerEvent} from 'react';
export type SheetMode='peek'|'half'|'full';
/**
 * The place card. Wide screens: a side panel next to the map. Narrow screens: a bottom sheet over the map with three
 * heights (summary, chart, everything). Drag or tap the handle; the map stays visible above it.
 */
export function PlaceSheet({mode,setMode,hi,children}:{mode:SheetMode;setMode:(m:SheetMode)=>void;hi:boolean;children:ReactNode}){
 const ref=useRef<HTMLElement>(null);const drag=useRef<{y:number;h:number;moved:boolean}|null>(null);
 const next=()=>setMode(mode==='peek'?'half':mode==='half'?'full':'half');
 const down=(e:PointerEvent<HTMLButtonElement>)=>{const el=ref.current;if(!el)return;drag.current={y:e.clientY,h:el.getBoundingClientRect().height,moved:false};e.currentTarget.setPointerCapture(e.pointerId);};
 const move=(e:PointerEvent<HTMLButtonElement>)=>{const d=drag.current,el=ref.current;if(!d||!el?.parentElement)return;const dy=d.y-e.clientY;if(Math.abs(dy)>5)d.moved=true;if(!d.moved)return;
  el.style.transition='none';el.style.height=`${Math.max(80,Math.min(el.parentElement.clientHeight-10,d.h+dy))}px`;};
 const up=()=>{const d=drag.current,el=ref.current;drag.current=null;if(!d||!el?.parentElement)return;if(!d.moved){next();return;}
  // Snap to the nearest of the three heights.
  const H=el.parentElement.clientHeight,h=el.getBoundingClientRect().height;el.style.transition='';el.style.height='';
  const snaps:[SheetMode,number][]=[['peek',118],['half',H*0.52],['full',H-10]];setMode(snaps.sort((a,b)=>Math.abs(a[1]-h)-Math.abs(b[1]-h))[0][0]);};
 return <aside ref={ref} className={`place-card sheet-${mode}`} aria-live="polite">
  <button className="sheet-handle" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={e=>{if(e.detail===0)next();}}
   aria-expanded={mode==='full'} aria-label={mode==='full'?(hi?'कम दिखाएं':'Show less'):(hi?'और दिखाएं':'Show more')}><i/></button>
  <div className="sheet-body">{children}</div>
 </aside>;
}
