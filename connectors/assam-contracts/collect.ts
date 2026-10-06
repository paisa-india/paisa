import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {saveImmutable,sha256} from '../../packages/provenance/index';
import {ASSAM_PATH,ASSAM_REPO,ASSAM_SOURCE_ID,parseAssam,parserVersion} from './index';
import type {ContractsFile,Source} from '../../packages/schema/index';
const UA='Paisa/0.1 public-procurement-collector';
/** Fetches the latest committed dataset (pinned by commit SHA), or re-parses the saved snapshot when offline. Writes data/contracts.json atomically. */
export async function collectContracts(root:string,online=true){
 const data=path.join(root,'data'),manifestPath=path.join(data,'snapshots',`${ASSAM_SOURCE_ID}.json`);
 let previous:Source|null=null;try{previous=JSON.parse(await readFile(manifestPath,'utf8'));}catch{}
 let source=previous;let raw:Uint8Array|null=null;
 if(online){
  const commits=await fetch(`https://api.github.com/repos/${ASSAM_REPO}/commits?path=${encodeURIComponent(ASSAM_PATH)}&per_page=1`,{headers:{'User-Agent':UA,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(30000)});
  if(!commits.ok)throw new Error(`GitHub commits HTTP ${commits.status}`);
  const [latest]=await commits.json() as {sha:string;commit:{author:{date:string}}}[];if(!latest?.sha||!/^[0-9a-f]{40}$/.test(latest.sha))throw new Error('No commit found for the Assam dataset');
  if(previous?.httpMetadata.commit===latest.sha)return {changed:false};
  const url=`https://raw.githubusercontent.com/${ASSAM_REPO}/${latest.sha}/${ASSAM_PATH}`;
  const response=await fetch(url,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(300000)});if(!response.ok)throw new Error(`Assam dataset HTTP ${response.status}`);
  raw=new Uint8Array(await response.arrayBuffer());if(raw.length>60000000)throw new Error('Assam dataset too large');
  const saved=await saveImmutable(path.join(data,'snapshots'),raw,'zip');
  source={id:ASSAM_SOURCE_ID,url,sha256:saved.hash,path:`data/snapshots/${saved.hash}.zip`,retrievedAt:new Date().toISOString(),httpMetadata:{commit:latest.sha,commitDate:latest.commit.author.date,'content-type':response.headers.get('content-type')??''},
   datasetVersion:`CivicDataLab Assam OCDS, commit ${latest.sha.slice(0,7)} (${latest.commit.author.date.slice(0,10)})`,parserVersion,authority:'CivicDataLab, with the Finance Department, Government of Assam',
   title:'Assam public procurement · contract awards (OCDS)',retrieval:'Automatic: latest commit of the published open dataset. The data was compiled by CivicDataLab from the Assam e-tender portal; Paisa does not access that portal.',
   license:{name:'Open Data Commons Open Database License (ODbL) 1.0',url:'https://opendatacommons.org/licenses/odbl/1-0/',redistributionAllowed:true,attribution:'Assam Public Procurement Data, CivicDataLab (assam.open-contracting.in), compiled with the Finance Department, Government of Assam. ODbL 1.0. Derived contract data in Paisa is shared under ODbL. PAISA is independent and not endorsed by any government.'}};
 }
 if(!source)throw new Error('No Assam snapshot; run online first');
 raw??=new Uint8Array(await readFile(path.join(root,source.path)));if(sha256(raw)!==source.sha256)throw new Error('Assam snapshot integrity mismatch');
 const parsed=parseAssam(raw,source);
 const file:ContractsFile={status:'PUBLISHED',publishedAt:new Date().toISOString(),...parsed};
 await mkdir(data,{recursive:true});const temp=path.join(data,'contracts.tmp');await writeFile(temp,JSON.stringify(file));await rename(temp,path.join(data,'contracts.json'));
 await writeFile(manifestPath,JSON.stringify(source,null,2));
 return {changed:true,file};
}
