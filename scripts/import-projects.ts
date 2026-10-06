import {collectProjects} from '../connectors/mospi-projects/collect';
const r=await collectProjects(process.cwd(),!process.argv.includes('--offline'));
console.log(r.changed?`MoSPI ${r.file!.reportMonth}: ${r.file!.projects.length} projects; ${r.file!.validations.map(v=>v.rule).join(' | ')}`:`MoSPI: ${r.reason}`);
