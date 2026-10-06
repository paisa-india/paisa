import {collectPmc} from '../connectors/pmc-accounts/collect';
await collectPmc(process.cwd());console.log('PMC accounts checked and validated.');
