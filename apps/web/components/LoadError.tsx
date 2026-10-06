'use client';
import {RefreshCw} from 'lucide-react';
/** A failed download, said plainly, with a way to try again. Never shown as "no data". */
export function LoadError({hi,what,onRetry}:{hi:boolean;what:[string,string];onRetry:()=>void}){
 return <div className="load-error" role="alert"><p>{hi?`${what[1]} लोड नहीं हो सका। इंटरनेट कनेक्शन जांचें और फिर कोशिश करें।`:`${what[0]} could not be loaded. Check your connection and try again.`}</p>
  <button className="outline" onClick={onRetry}><RefreshCw size={14}/>{hi?'फिर कोशिश करें':'Try again'}</button></div>;
}
