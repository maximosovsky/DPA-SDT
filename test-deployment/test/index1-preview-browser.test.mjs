import test from 'node:test';
import assert from 'node:assert/strict';
import {startSiteServer} from '../scripts/test-site-server.mjs';
import {chromium} from 'playwright';

test('built preview browser scenarios', async t => {
const server = await startSiteServer({preview:true});
const base=server.base;
let browser;
try {
 browser=await chromium.launch({headless:true});
 for (const width of [1280,390,320]) {
  await t.test(`built preview at ${width}px has no obsolete record and preserves offline controls`, async () => {
   const page = await browser.newPage({viewport:{width,height:900}});
   const errors=[]; page.on('pageerror', error => errors.push(error.message));
   const response=await page.goto(base+'/index1.html',{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200);
   assert.match(response.headers()['content-type'],/text\/html/);
   assert.equal(await page.title(),'Self Declared Token | Decentralized Partnership Agreement · design preview');
   await page.locator('.research').evaluate(el => el.open=true);
   const result=await page.evaluate(() => ({
     overflow:document.documentElement.scrollWidth>innerWidth+2,
     oldRecord:document.querySelector('#public-pilot,.mrz,.allocation'),
     bodyWeight:getComputedStyle(document.body).fontWeight,
     headingWeight:getComputedStyle(document.querySelector('h1')).fontWeight,
     brandWeight:getComputedStyle(document.querySelector('.brand')).fontWeight,
     buttonWeight:getComputedStyle(document.querySelector('button')).fontWeight,
     summaryWeight:getComputedStyle(document.querySelector('summary')).fontWeight,
     primaryNav:[...document.querySelectorAll('.site-links a')].map(el=>el.getAttribute('href'))}));
   assert.equal(result.overflow,false,`horizontal overflow at ${width}`);
   assert.equal(result.oldRecord,null);
   assert.deepEqual(result.primaryNav,['./dpa.html','./shares.html','./packages.html','./sale.html','./verify.html']);
   for(const weight of ['bodyWeight','headingWeight','brandWeight','summaryWeight']) assert.ok(Number(result[weight])<=500, `${weight} ${result[weight]}`);
   assert.equal(result.buttonWeight,'700','legacy SDT tools keep their scoped bold buttons');
   await page.locator('#sdt-tools').evaluate(el=>el.open=true);
   assert.equal(await page.locator('#network').textContent(),'Disconnected');
   await page.locator('#hash').click();
   await page.waitForFunction(() => document.querySelector('#digest').textContent.trim().length>0);
   assert.match(await page.locator('#digest').textContent(),/0x[0-9a-f]{64}/i);
   assert.deepEqual(errors,[]);
   if (process.env.PREVIEW_CAPTURE_DIR) await page.screenshot({path:`${process.env.PREVIEW_CAPTURE_DIR}/index1-${width}.png`,fullPage:true});
   await page.close();
  });
 }
 await t.test('built main route keeps its original identity and no preview stylesheet',async()=>{
  const page=await browser.newPage();
  const response=await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  assert.equal(await page.title(),'Self Declared Token | Decentralized Partnership Agreement · partnership workspace');
  assert.equal(await page.locator('.mrz').count(),0);
  assert.equal(await page.locator('link[href*="preview-"]').count(),0);
  await page.close();
 });
} finally {await browser?.close();await server.stop();}
});
