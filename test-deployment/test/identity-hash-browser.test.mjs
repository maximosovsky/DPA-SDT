import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {identityHashV2,verifyIdentityEvidenceV2} from '../src/identity-hash-v2.ts';

test('browser computes 13-field fixture and download roundtrips without clearing form or using wallet',async()=>{
 const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({acceptDownloads:true});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0]+'#sdt-tools');
  assert.match(await page.locator('.quick-warning').innerText(),/Download.*does not clear the form/);
  await page.locator('#hash').click();
  const digest=(await page.locator('#digest').innerText()).match(/0x[0-9a-f]{64}/)?.[0];
  assert.ok(digest);
  const input=await page.locator('#bankAccountNumber').inputValue();
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
  const evidence=JSON.parse(await (await import('node:fs/promises')).readFile(await download.path(),'utf8'));
  assert.equal(evidence.digest,digest);assert.equal(verifyIdentityEvidenceV2(JSON.stringify(evidence)),digest);
  assert.equal(identityHashV2(evidence.fields),digest);
  assert.equal(evidence.fields.bankAccountNumber,input);
  assert.equal(Object.keys(evidence.fields).length,13);
  assert.equal(await page.locator('#bankAccountNumber').inputValue(),input);
  assert.deepEqual(errors,[]);
  await page.locator('#bankAmount').fill('101.00');
  assert.match(await page.locator('#digest').innerText(),/Input changed/);
  await page.locator('#hash').click();
  assert.match(await page.locator('#digest').innerText(),/Rejected/);
  assert.equal(await page.locator('#mint').isDisabled(),true);
 }finally{await browser.close();await server.close();}
});
