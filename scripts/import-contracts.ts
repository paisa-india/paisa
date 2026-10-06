import {collectContracts} from '../connectors/assam-contracts/collect';
const result=await collectContracts(process.cwd(),!process.argv.includes('--offline'));
if(!result.changed)console.log('Assam contracts: no new dataset commit.');
else{const f=result.file!;console.log(`Assam contracts: ${f.contracts.length} awards, ${f.contractors.length} contractors. Excluded: ${f.excluded.map(e=>`${e.reason} ${e.count}`).join('; ')}`);}
