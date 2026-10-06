/**
 * Size budget for the static site (run after `npm run build:static`). Keeps first loads fast on mobile data.
 * Budgets are compressed (gzip) sizes, which is what visitors actually download.
 */
import {readdir,readFile,stat} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
const out=path.resolve('apps/web/out');
const PAGE_KB=120,DATA_KB=300;
// Full files published for data users only; the site itself never downloads them.
const API_ONLY=new Set(['data/contracts.json','data/cities-index.json','data/published.json']);
async function* walk(dir:string):AsyncGenerator<string>{for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())yield* walk(p);else yield p;}}
const failures:string[]=[];const report:[string,number][]=[];
for await(const file of walk(out)){
 const rel=path.relative(out,file);const isPage=rel.endsWith('index.html');const isData=rel.startsWith('data/')||rel.startsWith('geo/');
 if(!isPage&&!isData)continue;if((await stat(file)).size===0)continue;
 const kb=gzipSync(await readFile(file)).length/1024;report.push([rel,kb]);
 if(isPage&&kb>PAGE_KB)failures.push(`${rel}: ${kb.toFixed(0)} KB > ${PAGE_KB} KB page budget`);
 if(isData&&!API_ONLY.has(rel)&&kb>DATA_KB)failures.push(`${rel}: ${kb.toFixed(0)} KB > ${DATA_KB} KB data budget`);
}
report.sort((a,b)=>b[1]-a[1]);console.log('Largest (gzip):');for(const [f,kb] of report.slice(0,12))console.log(`  ${kb.toFixed(0).padStart(5)} KB  ${f}${API_ONLY.has(f)?'  (data users only)':''}`);
if(failures.length){console.error('\nSize budget exceeded:\n'+failures.join('\n'));process.exit(1);}
console.log(`\nAll pages ≤ ${PAGE_KB} KB and site data files ≤ ${DATA_KB} KB (gzip).`);
