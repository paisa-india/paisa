import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assignTiles,placeTiles,orderCategories,categoryColor,TILES} from '../apps/web/lib/tiles';

const counts=(o:Record<string,number>)=>new Map(Object.entries(o));
test('every tile gets exactly one category, matching the ₹100 split',()=>{
 const a=assignTiles(Array(TILES).fill(null),counts({x:60,y:30,z:10}),['x','y','z']);
 assert.equal(a.length,TILES);assert.equal(a.filter(c=>c==='x').length,60);assert.equal(a.filter(c=>c==='z').length,10);
 assert.throws(()=>assignTiles(Array(TILES).fill(null),counts({x:60,y:30}),['x','y']),/add up to 90/);
});
test('when the split changes, only the difference moves',()=>{
 const before=assignTiles(Array(TILES).fill(null),counts({x:60,y:30,z:10}),['x','y','z']);
 const after=assignTiles(before,counts({x:55,y:30,z:15}),['x','y','z']);
 const moved=after.filter((c,i)=>c!==before[i]).length;assert.equal(moved,5,'5 tiles move from x to z; the other 95 keep their category');
});
test('categories fill the grid in the fixed order, so a category stays in one block',()=>{
 const a=assignTiles(Array(TILES).fill(null),counts({x:20,y:80}),['y','x']);const cells=placeTiles(a,['y','x']);
 assert.deepEqual(new Set(cells).size,TILES,'no two tiles share a cell');
 for(let i=0;i<TILES;i++)assert.ok(a[i]==='y'?cells[i]<80:cells[i]>=80);
 assert.deepEqual(placeTiles(Array(TILES).fill(null),[]),Array.from({length:TILES},(_,i)=>i),'plain coins sit in order');
});
test('equivalent categories share a colour and order across PMC and cityfinance; bookkeeping comes last',()=>{
 assert.equal(categoryColor('establishment'),categoryColor('nmam-210'));
 assert.deepEqual(orderCategories([{metric:'nmam-272',share:50},{metric:'nmam-230',share:10},{metric:'nmam-210',share:40}]),['nmam-210','nmam-230','nmam-272']);
 assert.equal(categoryColor('unknown-metric','#123456'),'#123456');
});
