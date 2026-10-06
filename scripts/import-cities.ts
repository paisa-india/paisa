import {collectCities} from '../connectors/cityfinance/collect';
const limit=Number(process.argv.find(a=>a.startsWith('--limit='))?.slice(8)??Infinity);
const f=await collectCities(process.cwd(),{online:!process.argv.includes('--offline'),limit,cacheOnly:process.argv.includes('--cache-only')});
const years=f.cities.reduce((a,c)=>a+Object.keys(c.years).length,0);
console.log(`cityfinance: ${f.cities.length} cities, ${f.cities.filter(c=>Object.keys(c.years).length).length} with accounts, ${years} city-years. Excluded: ${f.excluded.map(e=>`${e.reason}: ${e.count}`).join('; ')||'none'}`);
