/**
 * Imports RBI "State Finances: A Study of Budgets" statements that a maintainer downloaded in a browser
 * (RBI's file server serves a bot challenge to scripts; Paisa does not bypass it).
 * Put the files in data/inbox/, then: node --import tsx scripts/import-rbi.ts && npm run ingest
 */
import {readFile,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {saveImmutable} from '../packages/provenance/index';
import {RBI_ARTIFACTS,RBI_BASE,parseStatement,validateShares,parserVersion} from '../connectors/rbi-state-finances/index';
import type {Source} from '../packages/schema/index';
const root=process.cwd();const all=[];const manifests:Source[]=[];
for(const a of RBI_ARTIFACTS){
 const file=path.join(root,'data/inbox',a.file);const raw=new Uint8Array(await readFile(file));
 const saved=await saveImmutable(path.join(root,'data/snapshots'),raw,'xlsx');
 const source:Source={id:a.id,url:RBI_BASE+a.file,sha256:saved.hash,path:`data/snapshots/${saved.hash}.xlsx`,retrievedAt:(await stat(file)).mtime.toISOString(),httpMetadata:{},
  datasetVersion:'State Finances: A Study of Budgets of 2025-26 (published January 2026)',parserVersion,authority:'Reserve Bank of India',title:a.title,
  retrieval:'Manual browser download by a maintainer. RBI serves a bot challenge to scripted requests.',
  license:{name:'Source-specific terms; review pending',url:'https://rbi.org.in/Scripts/AnnualPublications.aspx?head=State+Finances+%3A+A+Study+of+Budgets',redistributionAllowed:false,attribution:'Reserve Bank of India, State Finances: A Study of Budgets of 2025-26. Source: budget documents of the State governments. PAISA is independent and is not endorsed by RBI or any government.'}};
 // Parse before recording the manifest: an unexpected file never becomes a source.
 all.push(...parseStatement(raw,source,a.statement));
 manifests.push(source);
}
const [summary]=validateShares(all);
// Manifests are recorded only after every check passes.
for(const m of manifests){await writeFile(path.join(root,'data/snapshots',`${m.id}.json`),JSON.stringify(m,null,2));console.log(`${m.id}: ${m.sha256}`);}
console.log(`${all.length} share records parsed; ${summary.rule}`);
