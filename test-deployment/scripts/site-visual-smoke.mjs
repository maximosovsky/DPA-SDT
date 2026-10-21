import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.SITE_URL||'http://127.0.0.1:4174';
const pages=['','dpa.html','shares.html','sale.html','privacy.html','terms.html','contact.html'];
const sentence='Сервис документирования партнёрских соглашений между владельцами криптокошельков с идентификационным основанием участников и учётом долей.';
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1366,390]){
  const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  for(const name of pages){
   const response=await page.goto(`${base}/${name}`,{waitUntil:'networkidle'});assert.equal(response.status(),200,name);
   assert.equal((await page.locator('footer .mission').innerText()).trim(),sentence,name);
   assert.equal(await page.locator('a[href="/dpa.html"]').count()>0,true,name);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert.equal(overflow,false,`${name} horizontal overflow at ${width}`);
   if(name===''){
    assert.equal(await page.locator('main section[id]').count(),6);
    await page.locator('#hash').click();assert.match(await page.locator('#digest').innerText(),/0x66d71627/);
    console.log(width,'index surface',await page.locator('main section').first().evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color})), 'digest OK');
   }
   console.log(width,name||'index.html',response.status(), 'footer OK, no overflow');
  }
  assert.deepEqual(errors,[]);await page.close();
 }
}finally{await browser.close()}
