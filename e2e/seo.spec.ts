import {test,expect} from '@playwright/test';
// What search engines see: unique titles and descriptions, canonical links, a complete sitemap and plain-HTML place pages.
const SITE=(process.env.NEXT_PUBLIC_SITE_URL||'https://paisa-india.github.io/paisa').replace(/\/+$/,'');
const head=async(request:import('@playwright/test').APIRequestContext,path:string)=>{const html=await (await request.get(path)).text();
 const pick=(re:RegExp)=>html.match(re)?.[1]??null;
 return {html,title:pick(/<title>([^<]*)<\/title>/),description:pick(/<meta name="description" content="([^"]*)"/),canonical:pick(/<link rel="canonical" href="([^"]*)"/)};};

test('every main page has its own title, description and canonical link',async({request})=>{
 const paths=['/','/explore/','/my-tax/','/projects/','/contracts/','/contractors/','/signals/','/sources/','/about/','/places/'];
 const seen=new Set<string>();
 for(const p of paths){const h=await head(request,p);
  expect(h.title,p).toBeTruthy();expect(seen.has(h.title!),`duplicate title on ${p}`).toBe(false);seen.add(h.title!);
  expect(h.description?.length??0,p).toBeGreaterThan(60);expect(h.canonical,p).toBe(SITE+p);}
});

test('the sitemap lists every page once, under the public address',async({request})=>{
 const xml=await (await request.get('/sitemap.xml')).text();const locs=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 expect(locs.length).toBeGreaterThan(4000);expect(new Set(locs).size).toBe(locs.length);
 expect(locs.every(l=>l.startsWith(SITE+'/')&&l.endsWith('/'))).toBe(true);
 expect(locs).toContain(`${SITE}/places/maharashtra/pune-municipal-corporation/`);expect(locs).toContain(`${SITE}/places/tamil-nadu/`);
});

test('a city page is readable without JavaScript and describes itself to search engines',async({request,browser})=>{
 const h=await head(request,'/places/maharashtra/pune-municipal-corporation/');
 expect(h.title).toMatch(/^Pune municipal finances: income and spending 2015-16 to 2023-24 \| PAISA$/);
 expect(h.canonical).toBe(`${SITE}/places/maharashtra/pune-municipal-corporation/`);
 const ld=[...h.html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].flatMap(m=>{const v=JSON.parse(m[1]);return Array.isArray(v)?v:[v];});
 expect(ld.map(x=>x['@type'])).toEqual(expect.arrayContaining(['Dataset','BreadcrumbList','Organization','WebSite']));
 // The figures are in the HTML itself, not drawn later by scripts.
 const ctx=await browser.newContext({javaScriptEnabled:false});const page=await ctx.newPage();await page.goto('/places/maharashtra/pune-municipal-corporation/');
 await expect(page.getByRole('heading',{level:1})).toHaveText('Pune: how the city’s money came in and went out');
 await expect(page.getByRole('row',{name:/2023-24/})).toContainText('₹11206.84 crore');await ctx.close();
});

test('place pages link to each other and into the interactive map without errors',async({page})=>{
 const errs:string[]=[];page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
 await page.goto('/places/');await page.getByRole('link',{name:/Tamil Nadu/}).click();await expect(page).toHaveURL(/\/places\/tamil-nadu\/$/);
 await page.getByRole('link',{name:'Greater Chennai',exact:true}).click();await expect(page).toHaveURL(/greater-chennai-corporation\/$/);
 await page.getByRole('link',{name:/See Greater Chennai on the interactive map/}).click();await expect(page.locator('.place-card h2')).toHaveText('Greater Chennai');
 await page.getByRole('link',{name:/Page for this city/}).click();await expect(page).toHaveURL(/greater-chennai-corporation\/$/);
 expect(errs).toEqual([]);
});
