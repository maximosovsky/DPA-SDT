import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
try {
 for(const width of [390,1280]) {
  const page=await browser.newPage({viewport:{width,height:850}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/dpa.html?check=feedback');
  assert.equal(await page.locator('#status').innerText(),'Invalid invitation query');
  for(const address of ['', 'not-a-contract-address']) {
   await page.locator('#agreement-address').fill(address);
   // DOM click does not move focus to the button; routing cannot depend on activeElement.
   await page.evaluate(()=>document.querySelector('#load').click());
   await page.locator('#status').getByText(/Error:/).waitFor();
   assert.equal(await page.locator('#agreement-address').getAttribute('aria-invalid'),'true',`${width}: ${address||'blank'} address must be inline invalid`);
   assert.equal(await page.evaluate(()=>document.activeElement?.id),'agreement-address');
   assert.match(await page.locator('#agreement-address-error').innerText(),/address/i);
   assert.notEqual(await page.locator('#text').getAttribute('aria-invalid'),'true');
  }
  await page.locator('#preview').click();
  assert.equal(await page.locator('#ack').getAttribute('aria-invalid'),'true','draft validation must stay on the draft');
  assert.notEqual(await page.locator('#agreement-address').getAttribute('aria-invalid'),'true');
  assert.equal(await page.locator('#public-example').count(),0);
  assert.deepEqual(errors,[]);
  await page.close();
 }
} finally {await browser.close()}
