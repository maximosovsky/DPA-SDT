import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const routes=['/','/dpa.html','/shares.html','/sale.html','/privacy.html','/terms.html','/contact.html'];
let failed=false;
for(const width of [1280,390]){
 const page=await browser.newPage({viewport:{width,height:900}});
 for(const route of routes){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
  const state=await page.evaluate(()=>({h1:document.querySelector('h1')?.textContent,footer:document.querySelector('footer .mission')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth,russian:/[А-Яа-яЁё]/.test(document.body.innerText)}));
  console.log(JSON.stringify({width,route,status:response.status(),...state,errors}));
  if(response.status()!==200||state.overflow||state.russian||errors.length||!state.footer?.startsWith('A service'))failed=true;
  page.removeAllListeners('pageerror');
 }
 await page.goto(base+'/dpa.html');await page.locator('#text').fill('Synthetic Alice and Synthetic Bob locally agree to fictional terms.');await page.locator('#person-0').fill('0x0000000000000000000000000000000000000001');await page.locator('#person-1').fill('0x0000000000000000000000000000000000000002');await page.locator('#ack').check();await page.locator('#preview').click();const preview=await page.evaluate(()=>({status:document.querySelector('#status')?.textContent,preview:document.querySelector('#draft-preview')?.textContent?.slice(0,100),exportDisabled:document.querySelector('#export-evidence')?.disabled,network:document.querySelector('#network')?.textContent}));console.log('PREVIEW',width,JSON.stringify(preview));if(!preview.preview?.includes('Synthetic Alice')||preview.exportDisabled||preview.network!=='Disconnected')failed=true;
 await page.close();
}
await browser.close();if(failed)process.exitCode=1;
