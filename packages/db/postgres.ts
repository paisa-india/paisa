import {Pool} from 'pg';
import {z} from 'zod';
const Filters=z.object({geography:z.string().max(100).optional(),sector:z.string().max(50).optional(),minValue:z.string().regex(/^\d+$/).optional(),limit:z.coerce.number().int().min(1).max(100).default(50)});
/** Optional production adapter. All money is returned as decimal strings by pg. */
export function createPostgresRepository(connectionString:string){const pool=new Pool({connectionString,max:5,statement_timeout:5000});return {
 async projects(raw:unknown){const f=Filters.parse(raw);const {rows}=await pool.query(`SELECT p.id,p.name,p.sector,p.geography_id,ST_AsGeoJSON(p.location)::json AS geometry FROM projects p WHERE ($1::text IS NULL OR p.geography_id=$1) AND ($2::text IS NULL OR p.sector=$2) ORDER BY p.name LIMIT $3`,[f.geography??null,f.sector??null,f.limit]);return rows;},
 async contracts(raw:unknown){const f=Filters.parse(raw);const {rows}=await pool.query(`SELECT c.id,c.tender_id,c.contractor_id,c.award_date,m.amount_rupees::text,m.provenance_id FROM contracts c JOIN published_money_records m ON m.entity_type='contract' AND m.entity_id=c.id AND m.value_type='AWARDED_VALUE' WHERE ($1::numeric IS NULL OR m.amount_rupees >= $1) ORDER BY c.award_date DESC LIMIT $2`,[f.minValue??null,f.limit]);return rows;},
 close:()=>pool.end()
};}
