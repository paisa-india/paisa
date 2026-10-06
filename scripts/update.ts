/**
 * One unattended update run: check every source, keep going when one fails, rebuild the verified dataset,
 * and describe what changed. Safe to run on a schedule (GitHub Actions) or by hand: `npm run update`.
 * Exit code 0 = run completed (individual connectors may be degraded; see data/alerts). Non-zero = no dataset could be built.
 */
import {readFile,writeFile,mkdir,readdir,appendFile} from 'node:fs/promises';
import path from 'node:path';
import {collectCga} from '../connectors/cga/collect';
import {collectPmc} from '../connectors/pmc-accounts/collect';
import {collectContracts} from '../connectors/assam-contracts/collect';
import {collectProjects} from '../connectors/mospi-projects/collect';
import {ingest} from '../apps/workers/pipeline';
import {formatMoney} from '../packages/calculations/index';
import type {Dataset} from '../packages/schema/index';
const root=process.cwd(),data=path.join(root,'data'),now=new Date();
const day=now.toISOString().slice(0,10);
await mkdir(path.join(data,'alerts'),{recursive:true});await mkdir(path.join(data,'changes'),{recursive:true});
const alertsBefore=new Set(await readdir(path.join(data,'alerts')));
const previousText=await readFile(path.join(data,'published.json'),'utf8');const previous:Dataset=JSON.parse(previousText);
const results:{connector:string;ok:boolean;message:string}[]=[];
async function step(connector:string,run:()=>Promise<unknown>){
 try{await run();results.push({connector,ok:true,message:'checked'});}
 catch(error){results.push({connector,ok:false,message:error instanceof Error?error.message:String(error)});}
}
// Collectors that fetch online publish their own artifacts; the final ingest rebuilds everything from verified snapshots.
await step('cga',()=>collectCga(root));
await step('pmc-accounts',()=>collectPmc(root));
await step('assam-contracts',()=>collectContracts(root,true));
let projectsNote:string|undefined;
await step('mospi-projects',async()=>{const r=await collectProjects(root,true);if(!r.changed)projectsNote=r.reason;});
await step('union-budget + rebuild',()=>ingest(root,true));
// If the online budget check failed, still rebuild from preserved snapshots so the other connectors' updates are kept.
if(!results.at(-1)!.ok)await step('rebuild from snapshots',()=>ingest(root,false));
const next:Dataset=JSON.parse(await readFile(path.join(data,'published.json'),'utf8'));
// Compare content, ignoring the publication timestamp.
const strip=(d:Dataset)=>JSON.stringify({...d,publishedAt:null});
const changed=strip(previous)!==strip(next);
if(!changed)await writeFile(path.join(data,'published.json'),previousText);
// Reminders for sources that cannot be fetched by scripts.
const rbi=next.sources.find(s=>s.id==='rbi-sf-2025-26-st33');
const reminders:string[]=[];
// MoSPI publishes around the 25th for the month before last; remind if we are more than ~2 months behind.
if(projectsNote&&next.projectsSummary){const [y,m]=next.projectsSummary.reportMonth.split('-').map(Number);const behind=(now.getUTCFullYear()-y)*12+(now.getUTCMonth()+1-m);if(behind>2)reminders.push(`MoSPI Flash Report: Paisa has ${next.projectsSummary.reportMonth}. ${projectsNote}`);}
if(rbi&&now.getUTCMonth()<=2&&!next.sources.some(s=>s.id.startsWith(`rbi-sf-${now.getUTCFullYear()}-`)))
 reminders.push(`RBI "State Finances: A Study of Budgets" for ${now.getUTCFullYear()}-${String(now.getUTCFullYear()+1).slice(2)} is usually published around January. When it appears, download Statements 33 and 34 (XLSX) from https://rbi.org.in/Scripts/AnnualPublications.aspx?head=State+Finances+%3A+A+Study+of+Budgets into data/inbox/, update the file names in connectors/rbi-state-finances/index.ts, then run scripts/import-rbi.ts and npm run ingest.`);
// Plain-language change summary built only from published records.
const lines:string[]=[`# Paisa data update · ${day}`,''];
if(changed){
 const before=new Map(previous.records.map(r=>[r.id,r])),after=new Map(next.records.map(r=>[r.id,r]));
 const added=[...after.values()].filter(r=>!before.has(r.id)),removed=[...before.values()].filter(r=>!after.has(r.id));
 const revised=[...after.values()].filter(r=>before.has(r.id)&&before.get(r.id)!.amountRupees!==r.amountRupees);
 const newSources=next.sources.filter(s=>{const o=previous.sources.find(x=>x.id===s.id);return !o||o.sha256!==s.sha256;});
 lines.push(`**${added.length} new, ${revised.length} revised, ${removed.length} removed** money records. New or changed source documents: ${newSources.map(s=>s.title??s.id).join(', ')||'none'}.`,'');
 for(const r of revised.slice(0,30)){const o=before.get(r.id)!;const diff=BigInt(r.amountRupees)-BigInt(o.amountRupees);lines.push(`- ${r.label} (${r.fiscalYear} ${r.valueType}, ${r.period}): ${formatMoney(o.amountRupees)} → ${formatMoney(r.amountRupees)} (${diff>=0n?'+':'−'}${formatMoney((diff<0n?-diff:diff).toString())})`);}
 for(const r of added.slice(0,30))lines.push(`- New: ${r.label} (${r.fiscalYear} ${r.valueType}, ${r.period}): ${formatMoney(r.amountRupees)}`);
 if(added.length+revised.length>60)lines.push(`- …and ${added.length+revised.length-60} more.`);
}else lines.push('No published figures changed.');
lines.push('','## Connectors',...results.map(r=>`- ${r.ok?'✅':'⚠️'} ${r.connector}: ${r.ok?'ok':r.message}`));
if(reminders.length)lines.push('','## Needs a person',...reminders.map(r=>`- ${r}`));
lines.push('','Every figure above comes from published, validated records. Nothing here is an estimate.');
const summary=lines.join('\n')+'\n';
if(changed)await writeFile(path.join(data,'changes',`${day}.md`),summary);
await writeFile(path.join(data,'alerts','last-run-summary.md'),summary);
for(const r of reminders)await writeFile(path.join(data,'alerts',`reminder-rbi-${now.getUTCFullYear()}.md`),`# Manual download needed: RBI State Finances\n\n${r}\n`);
const newAlerts=(await readdir(path.join(data,'alerts'))).filter(f=>!alertsBefore.has(f)&&f!=='last-run-summary.md');
console.log(summary);
// Machine-readable outputs for the GitHub workflow.
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`changed=${changed}\nalerts=${newAlerts.join(',')}\n`);
if(results.every(r=>!r.ok))process.exit(1);
