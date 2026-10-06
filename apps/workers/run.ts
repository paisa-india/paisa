import {Queue,Worker} from 'bullmq';
import {ingest} from './pipeline';
import {collectCga} from '../../connectors/cga/collect';
import {collectPmc} from '../../connectors/pmc-accounts/collect';
const connection={host:process.env.REDIS_HOST??'127.0.0.1',port:Number(process.env.REDIS_PORT??6379),password:process.env.REDIS_PASSWORD};
const queue=new Queue('paisa-ingestion',{connection});
// Daily during Jan/Feb; weekly otherwise. One worker with bounded retries.
await queue.upsertJobScheduler('budget-season',{pattern:'0 6 * 1,2 *',tz:'Asia/Kolkata'},{name:'union-budget',data:{},opts:{attempts:3,backoff:{type:'exponential',delay:60000}}});
await queue.upsertJobScheduler('budget-weekly',{pattern:'0 6 * 3-12 1',tz:'Asia/Kolkata'},{name:'union-budget',data:{},opts:{attempts:3,backoff:{type:'exponential',delay:60000}}});
await queue.upsertJobScheduler('cga-daily',{pattern:'0 7 * * *',tz:'Asia/Kolkata'},{name:'cga',data:{},opts:{attempts:3,backoff:{type:'exponential',delay:60000}}});
await queue.upsertJobScheduler('pmc-weekly',{pattern:'0 8 * * 1',tz:'Asia/Kolkata'},{name:'pmc-accounts',data:{},opts:{attempts:3,backoff:{type:'exponential',delay:60000}}});
const worker=new Worker('paisa-ingestion',async(job)=>job.name==='cga'?collectCga(process.cwd()):job.name==='pmc-accounts'?collectPmc(process.cwd()):ingest(process.cwd(),true),{connection,concurrency:1});
worker.on('failed',(job,error)=>console.error(JSON.stringify({event:'connector-degraded',job:job?.id,error:error.message,issueDraft:'data/alerts/'})));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await worker.close();await queue.close();process.exit(0);});
console.log('PAISA ingestion scheduler running.');
