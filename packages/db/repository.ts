import {readFile} from 'node:fs/promises';
import path from 'node:path';
import type {ContractsFile,Dataset,ProjectsFile} from '../schema/index';
import {stat} from 'node:fs/promises';
export const dataDirectory=()=>process.env.PAISA_DATA_DIR??path.resolve(process.cwd(),process.cwd().endsWith('/apps/web')?'../../data':'data');
export async function readDataset():Promise<Dataset>{const d=JSON.parse(await readFile(path.join(dataDirectory(),'published.json'),'utf8'));if(d.status!=='PUBLISHED')throw new Error('No published dataset');return d;}
export async function readHealth(connector='union-budget'){try{return JSON.parse(await readFile(path.join(dataDirectory(),connector==='union-budget'?'health.json':`${connector}-health.json`),'utf8'));}catch{return {status:'not-connected',lastSuccess:null};}}
export async function readRunSummary(){try{return await readFile(path.join(dataDirectory(),'alerts','last-run-summary.md'),'utf8');}catch{return null;}}
let contractsCache:{mtime:number;file:ContractsFile}|null=null;
/** Contract awards live in their own file (several MB) and are only loaded by contract pages and APIs. */
export async function readContracts():Promise<ContractsFile|null>{
 const file=path.join(dataDirectory(),'contracts.json');let mtime:number;try{mtime=(await stat(file)).mtimeMs;}catch{return null;}
 if(contractsCache?.mtime===mtime)return contractsCache.file;
 const parsed=JSON.parse(await readFile(file,'utf8')) as ContractsFile;if(parsed.status!=='PUBLISHED')return null;contractsCache={mtime,file:parsed};return parsed;
}
let projectsCache:{mtime:number;file:ProjectsFile}|null=null;
export async function readProjects():Promise<ProjectsFile|null>{
 const file=path.join(dataDirectory(),'projects.json');let mtime:number;try{mtime=(await stat(file)).mtimeMs;}catch{return null;}
 if(projectsCache?.mtime===mtime)return projectsCache.file;
 const parsed=JSON.parse(await readFile(file,'utf8')) as ProjectsFile;if(parsed.status!=='PUBLISHED')return null;projectsCache={mtime,file:parsed};return parsed;
}
