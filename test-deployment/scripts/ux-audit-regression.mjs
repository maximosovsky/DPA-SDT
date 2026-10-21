import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
try {
 for(const width of [320,390,1280]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/','/dpa.html','/shares.html','/sale.html','/privacy.html','/terms.html','/contact.html']) {
   const response=await page.goto(base+route);
   assert.equal(response.status(),200,route);
   const nav=await page.locator('.site-links a').evaluateAll(links=>links.map(link=>({name:link.textContent.trim(),height:link.getBoundingClientRect().height})));
   assert.equal(nav.length,5,route);
   for(const link of nav) assert.ok(link.height>=44,`${width} ${route} ${link.name}: ${link.height}px`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} ${route} horizontal overflow`);
  }
  await page.goto(base+'/dpa.html');
  const warning=page.locator('main .warning');
  assert.match(await warning.innerText(),/synthetic/i);
  assert.match(await warning.innerText(),/public/i);
  assert.match(await warning.innerText(),/exact/i);
  const details=page.locator('main details.legal-limits');
  assert.equal(await details.count(),1);
  await details.locator('summary').focus();await page.keyboard.press('Enter');
  assert.equal(await details.getAttribute('open'),'');
  assert.match(await details.innerText(),/Self-declared SDT does not verify identity/);
  assert.equal(await page.locator('#public-example').count(),0);
  assert.deepEqual(errors,[]);
  await page.close();
 }
} finally {await browser.close()}
