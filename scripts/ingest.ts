import {ingest} from '../apps/workers/pipeline';
const data=await ingest(process.cwd(),process.argv.includes('--online'));
console.log(`Published ${data.records.length} verified financial records; ${data.validations.length} reconciliations passed.`);
