import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
export function sha256(raw:Uint8Array){return createHash('sha256').update(raw).digest('hex');}
export async function saveImmutable(dir:string,raw:Uint8Array,ext='pdf'){
 const hash=sha256(raw);await mkdir(dir,{recursive:true});const file=path.join(dir,`${hash}.${ext}`);
 try{await writeFile(file,raw,{flag:'wx',mode:0o444});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;if(sha256(await readFile(file))!==hash)throw new Error('Snapshot integrity failure');}
 return {hash,file};
}
