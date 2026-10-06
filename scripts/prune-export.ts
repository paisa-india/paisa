/**
 * After `next build` (static export): remove the client-navigation payloads of the place pages. Those pages are plain HTML
 * reached through ordinary links, so the files are never requested; without them the 4,000+ place pages take a third of the
 * space, keeping the site well inside GitHub Pages' 1 GB limit.
 */
import {readdir,rm,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('apps/web/out/places');let files=0,bytes=0;
async function walk(dir:string):Promise<void>{
 for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);
  if(e.isDirectory()){await walk(p);continue;}
  if(e.name.endsWith('.txt')&&(e.name==='index.txt'||e.name.startsWith('__next.'))){bytes+=(await stat(p)).size;files++;await rm(p);}}
}
try{await walk(root);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
console.log(`Pruned ${files} navigation payloads from place pages (${(bytes/1e6).toFixed(0)} MB).`);
