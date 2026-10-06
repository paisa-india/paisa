import {test,expect,type Page} from '@playwright/test';
// Browser checks for what a person sees: the right place's data, retries after failed downloads, and shareable links.
const PUNE='5eb5844f76a3b61f40ba0694',CHENNAI='5fa24662072dab780a6f156f';
const loadError=(page:Page)=>page.locator('.load-error');
const projectsCount=(page:Page)=>page.locator('#projects').getByText(/^[\d,]+ projects$/);

test('changing place never leaves the previous place\'s projects on screen',async({page})=>{
 await page.goto('/projects/');await page.locator('#projects').scrollIntoViewIfNeeded();
 await expect(projectsCount(page)).toHaveText(/^1,9\d\d projects$/);
 await page.getByLabel('Or choose a state / UT').selectOption('chandigarh');
 await page.locator('#projects').scrollIntoViewIfNeeded();
 await expect(page.locator('#projects h2')).toContainText('Chandigarh');
 await expect(projectsCount(page)).toHaveText('0 projects');
 await expect(page.locator('#projects .project-card')).toHaveCount(0);
 await expect(page.getByText(/lists no central projects of ₹150 crore or more in Chandigarh/)).toBeVisible();
});

test('a failed download says so and can be retried',async({page})=>{
 let fail=true;
 await page.route('**/data/projects.json',route=>fail?route.abort():route.continue());
 await page.goto('/projects/');await page.locator('#projects').scrollIntoViewIfNeeded();
 await expect(loadError(page).filter({hasText:'Projects could not be loaded'})).toBeVisible();
 fail=false;await page.getByRole('button',{name:'Try again'}).click();
 await expect(projectsCount(page)).toBeVisible();await expect(loadError(page)).toHaveCount(0);
});

test('contracts: a failed first download is retried, and "Show more" never repeats rows',async({page})=>{
 let fail=true;
 await page.route('**/data/contracts-list.json',route=>fail?route.abort():route.continue());
 await page.goto('/contracts/');
 await expect(loadError(page)).toContainText('Contract data could not be loaded');
 fail=false;await page.getByRole('button',{name:'Try again'}).click();
 const rows=page.locator('.contract-list > li');await expect(rows).toHaveCount(25);
 await page.getByRole('button',{name:'Show more'}).click();await expect(rows).toHaveCount(50);
 const titles=await rows.evaluateAll(els=>els.map(e=>e.textContent));expect(new Set(titles).size).toBe(50);
 // Changing a filter starts again from page 1 with only matching rows.
 await page.getByRole('button',{name:'Only single-bid'}).click();await expect(rows).toHaveCount(25);
 await expect(rows.filter({hasNotText:'Single bid'})).toHaveCount(0);
 await expect(page).toHaveURL(/single=1/);
});

test('a signal links to exactly the awards it compares',async({page})=>{
 await page.goto('/signals/');await page.getByRole('button',{name:/Supplier concentration/}).click();
 const card=page.locator('.signal-card').first();const link=card.getByRole('link',{name:/See all \d+ awards in this comparison/});
 const n=Number((await link.textContent())!.match(/\d+/)![0]);await link.click();
 await expect(page).toHaveURL(/fy=\d{4}-\d{2}.*checked=1|checked=1.*fy=/);
 await expect(page.getByText(new RegExp(`^${n} awards match$`))).toBeVisible();
});

test('signals: a failed download can be retried',async({page})=>{
 let fail=true;await page.route('**/data/signals.json',route=>fail?route.abort():route.continue());
 await page.goto('/signals/');await expect(loadError(page)).toContainText('Signals could not be loaded');
 fail=false;await page.getByRole('button',{name:'Try again'}).click();await expect(page.locator('.signal-card').first()).toBeVisible();
});

test('search a city by name and share the exact view as a link',async({page})=>{
 await page.goto('/');const search=page.getByRole('combobox',{name:'Search a city or state'});
 await search.fill('pune');await page.getByRole('option',{name:/^Pune Maharashtra · \d+ years of accounts/}).click();
 await expect(page).toHaveURL(new RegExp(`/projects/?\\?state=maharashtra&city=${PUNE}`));
 await expect(page.locator('.place-card h2')).toHaveText('Pune');
 // Opening a shared link shows the same city and year.
 await page.goto(`/projects/?state=tamil-nadu&city=${CHENNAI}&year=2020-21`);
 await expect(page.locator('.place-card h2')).toHaveText('Greater Chennai');
 await expect(page.locator('.map-years button[aria-pressed="true"]')).toHaveText('2020-21');
 await page.locator('.map-years').getByRole('button',{name:'2022-23'}).click();await expect(page).toHaveURL(/year=2022-23/);
});

test('a city whose accounts fail to download is not shown as having no accounts',async({page})=>{
 await page.route('**/data/cities/tamil-nadu/*.json',route=>route.abort());
 await page.goto(`/projects/?state=tamil-nadu&city=${CHENNAI}`);
 await expect(loadError(page)).toContainText('This city’s accounts could not be loaded');
});

test('search finds cities by their former names',async({page})=>{
 await page.goto('/projects/');const search=page.getByRole('combobox',{name:'Search a city or state'});
 await search.fill('aurangabad');await expect(page.getByRole('option',{name:/^Chhatrapati Sambhajinagar Maharashtra/})).toBeVisible();
 await search.fill('bombay');await expect(page.getByRole('option').first()).toContainText('Brihanmumbai');
});

test('on a phone, the chosen year stays reachable in the year row',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(`/projects/?state=maharashtra&city=${PUNE}&year=2016-17`);
 const on=page.locator('.map-years button[aria-pressed="true"]');await expect(on).toHaveText('2016-17');await expect(on).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('on a phone, the place card is a bottom sheet with three heights',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(`/projects/?state=tamil-nadu&city=${CHENNAI}`);const sheet=page.locator('.place-card');
 await expect(sheet).toHaveClass(/sheet-half/);await expect(sheet.locator('h2')).toHaveText('Greater Chennai');
 const handle=page.getByRole('button',{name:'Show more'});await handle.click();await expect(sheet).toHaveClass(/sheet-full/);
 await page.getByRole('button',{name:'Show less'}).click();await expect(sheet).toHaveClass(/sheet-half/);
 // Choosing another place opens it at the summary height again.
 await page.locator('.map-crumbs').getByRole('button',{name:'Tamil Nadu'}).click();await expect(sheet).toHaveClass(/sheet-half/);
});

test('the ₹100 coins regroup when the year changes, without restarting the story',async({page})=>{
 await page.goto(`/projects/?state=tamil-nadu&city=${CHENNAI}&year=2021-22`);
 const story=page.locator('#city-story');await story.scrollIntoViewIfNeeded();await story.getByRole('tab',{name:/Went to/}).click();
 await expect(story.locator('.tile')).toHaveCount(100);
 const before=await story.locator('.tile').evaluateAll(t=>t.map(e=>(e as HTMLElement).style.cssText));
 await page.locator('.map-years').getByRole('button',{name:'2022-23'}).click();
 await expect(story.getByRole('tab',{selected:true})).toContainText('Went to');
 await expect(story.getByText(/^Compared with 2021-22:/)).toBeVisible();
 const after=await story.locator('.tile').evaluateAll(t=>t.map(e=>(e as HTMLElement).style.cssText));
 expect(after.length).toBe(100);expect(after.some((x,i)=>x!==before[i])).toBe(true);
 // Tapping a category explains it, and says what is not known.
 await story.locator('.story-legend button').first().click();
 await expect(story.locator('.story-explain')).toContainText('Who received it');await expect(story.locator('.story-explain')).toContainText('Missing link');
});

test('scrolling the page over the map scrolls the page, not the map',async({page})=>{
 await page.goto('/projects/');await page.waitForSelector('.map-stage > svg');
 const box=(await page.locator('.map-stage > svg').boundingBox())!;await page.mouse.move(box.x+box.width/3,box.y+box.height/2);
 const zoom=()=>page.locator('.map-zoom').evaluate(e=>(e as HTMLElement).style.transform);const z0=await zoom();
 const y0=await page.evaluate(()=>window.scrollY);await page.mouse.wheel(0,400);await page.waitForTimeout(300);
 expect(await page.evaluate(()=>window.scrollY)).toBeGreaterThan(y0);expect(await zoom()).toBe(z0);
});

test('tapping a budget item explains it first, compares like with like, and offers separate routes for concerns',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 await page.goto('/explore/');await page.getByRole('button',{name:'Interest payments: what it means and its source'}).click();
 const d=page.locator('dialog[open]');await expect(d.getByRole('heading',{name:'Interest payments'})).toBeVisible();
 await expect(d.getByText(/Repaying the borrowed amount itself is not in this figure/)).toBeVisible();
 await expect(d.getByText('Comparing budget estimates only, from the same series.')).toBeVisible();
 await expect(d.getByText(/Union Budget 2026-27 · Budget at a Glance/)).toBeVisible();
 // Technical details are tucked away until asked for.
 await expect(d.getByText('SHA-256')).toBeHidden();await d.getByText('Technical details').click();await expect(d.getByText('SHA-256')).toBeVisible();
 // RTI: a central authority goes to RTI Online; the draft is only prepared, never submitted by Paisa.
 await d.getByRole('button',{name:/I need the underlying records/}).click();
 await expect(d.locator('textarea')).toHaveValue(/Department of Economic Affairs, Ministry of Finance[\s\S]*Right to Information Act, 2005/);
 await expect(d.getByRole('link',{name:/RTI Online/})).toHaveAttribute('href','https://rtionline.gov.in/');
 await d.getByRole('button',{name:'Copy draft'}).click();await expect(d.getByRole('status')).toContainText('It has not been submitted');
 // Grievances are a different route (CPGRAMS), not RTI.
 await d.getByRole('button',{name:/A service or project has a problem/}).click();await expect(d.getByRole('link',{name:/CPGRAMS/})).toHaveAttribute('href','https://pgportal.gov.in/');
});

test('city figures route concerns to the city, not to central portals',async({page})=>{
 await page.goto(`/projects/?state=tamil-nadu&city=${CHENNAI}`);await page.locator('.place-card .per100 button').first().click();
 const d=page.locator('dialog[open]');await d.getByRole('button',{name:/I need the underlying records/}).click();
 await expect(d.locator('textarea')).toHaveValue(/Greater Chennai Corporation/);await expect(d.getByRole('link',{name:/RTI Online/})).toHaveCount(0);
 await expect(d.getByText(/RTI Online does not cover/)).toBeVisible();
});

test('a late project shows its original and revised dates on a timeline',async({page})=>{
 await page.goto('/projects/');await page.locator('#projects').scrollIntoViewIfNeeded();
 await page.locator('#projects').getByRole('button',{name:'Running late'}).click();const card=page.locator('.project-card').first();
 await expect(card.locator('.timeline .tl-late')).toBeVisible();await expect(card.locator('.tl-labels .struck')).toBeVisible();await expect(card.locator('.tl-report')).toContainText('Report');
});

test('every page loads without errors in the console (including hydration mismatches)',async({page})=>{
 for(const path of ['/','/explore/','/my-tax/','/projects/','/contracts/','/contractors/','/signals/','/sources/','/about/']){
  const errs:string[]=[];const onErr=(e:Error)=>errs.push(e.message);const onCon=(m:import('@playwright/test').ConsoleMessage)=>{if(m.type()==='error')errs.push(m.text());};
  page.on('pageerror',onErr);page.on('console',onCon);await page.goto(path);await page.waitForTimeout(800);page.off('pageerror',onErr);page.off('console',onCon);
  expect(errs,`${path}`).toEqual([]);
 }
});
