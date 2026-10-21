import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=process.argv.find(arg=>/^https?:\/\//.test(arg))||process.env.SITE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
try{
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
  const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const path of ['/','/dpa.html','/shares.html','/sale.html','/terms.html','/privacy.html','/contact.html']){
   await page.goto(root+path,{waitUntil:'domcontentloaded'});
   await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.className),'skip-link',path);
   assert.equal(await page.locator('main#main').count(),1,path);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,`${path}: horizontal overflow`);
  }
  await page.goto(root+'/dpa.html');
  assert.equal(await page.evaluate(()=>{let e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented}),false,'clean draft');
  await page.locator('#preview').click();assert.equal(await page.locator('#ack').getAttribute('aria-invalid'),'true');assert.equal(await page.evaluate(()=>document.activeElement?.id),'ack');
  await page.locator('#text').fill('Fictional terms for synthetic partners');
  assert.equal(await page.evaluate(()=>{let e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented}),true,'dirty draft');
  assert.deepEqual(errors,[]);
  console.log(`UI ${viewport.width}: 7 routes skip/focus, overflow, validation focus, clean/dirty guard, pageerrors=0`);
  await page.close();
 }
}finally{await browser.close()}
