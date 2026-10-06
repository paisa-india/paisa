/**
 * Monthly: re-download all cities only if cityfinance reports newer data than Paisa's snapshot.
 * A full download takes a few hours (one polite request per city), so it runs in its own workflow.
 */
import {readFile} from 'node:fs/promises';
import {collectCities,citiesLastUpdated} from '../connectors/cityfinance/collect';
import {CITYFINANCE_SOURCE_ID} from '../connectors/cityfinance/index';
const current=await citiesLastUpdated();if(!current){console.log('cityfinance: last-updated date unavailable; nothing done.');process.exit(0);}
let have='';try{have=JSON.parse(await readFile(`data/snapshots/${CITYFINANCE_SOURCE_ID}.json`,'utf8')).httpMetadata?.lastUpdated??'';}catch{}
if(have===current&&!process.argv.includes('--force')){console.log(`cityfinance: unchanged (${current}).`);process.exit(0);}
const f=await collectCities(process.cwd(),{online:true});console.log(`cityfinance: refreshed ${f.cities.length} cities (source updated ${current}).`);
