import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
const base='http://127.0.0.1:5189';const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5189','--strictPort'],{stdio:'ignore'});
for(let i=0;i<70;i++){try{if((await fetch(base)).ok)break}catch{}await pause(150)}
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/','/dpa.html','/shares.html','/sale.html','/privacy.html','/terms.html','/contact.html']){
   const r=await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.waitForTimeout(350);
   const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,heading:document.querySelector('h1')?.textContent,skip:!!document.querySelector('.skip-link'),disabled:[...document.querySelectorAll('#accept,#claim,#buy')].map(x=>x.disabled)}));
   if(r.status()!==200||state.overflow>2||!state.skip||state.disabled.some(x=>!x))throw Error(`${width} ${route} ${JSON.stringify(state)}`);
   console.log(width,route,JSON.stringify(state));
  }
  if(width===390){
   await page.goto(base+'/');await page.locator('.legacy summary').click();await page.locator('#hash').click();
   if(!(await page.locator('#digest').innerText()).includes('SHA256'))throw Error('Hash not computed');
   await page.locator('#bankAmount').fill('101.00');await page.locator('#hash').click();
   if(!(await page.locator('#digest').innerText()).includes('Rejected'))throw Error('Modified banking fixture accepted');
   await page.locator('#bankAmount').fill('100.00');await page.locator('#hash').click();
   const download=page.waitForEvent('download');await page.locator('#export').click();const saved=await download;const fs=await import('node:fs/promises');const data=JSON.parse(await fs.readFile(await saved.path(),'utf8'));
   for(const k of ['bankName','bankBic','bankAccountNumber','bankDate','bankTime','bankTimezone','bankAmount','bankCurrency','bankRecipient'])if(!data.bankTrace[k])throw Error('Missing '+k);
   console.log('BANK_EXPORT',JSON.stringify(data.bankTrace),'digest',data.digest);
   await page.goto(base+'/dpa.html');await page.locator('#text').fill('Fictional partners Alice and Bob allocate 60 / 40 of a test collaboration.');await page.locator('#person-0').fill('0xBd2aa57e6D4a85939a0f635888EaEc9B0F4d0C12');await page.locator('#person-1').fill('0x18FA86747a9eDfbB0B79883aff42A038065A44e5');await page.locator('#share-0').fill('60');await page.locator('#share-1').fill('40');await page.locator('#ack').check();await page.locator('#preview').click();console.log('DRAFT',JSON.stringify({preview:(await page.locator('#draft-preview').innerText()).slice(0,180),deployDisabled:await page.locator('#deploy').isDisabled(),acceptDisabled:await page.locator('#accept').isDisabled()}));

  }
  console.log('ERRORS',width,JSON.stringify(errors));await page.close();
 }
}finally{await browser.close();server.kill()}
