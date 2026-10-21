import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.SITE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const routes=['/','/dpa.html','/shares.html','/sale.html','/privacy.html','/terms.html','/contact.html'];
const active=['/','/dpa.html','/shares.html','/sale.html',null,null,null];
const measurements=[];
try{
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});
  for(const [index,route] of routes.entries()){
   assert.equal((await page.goto(base+route)).status(),200);
   const links=page.locator('.site-links a[aria-current="page"]');
   assert.equal(await links.count(),active[index]?1:0,`${width} ${route} active count`);
   if(active[index]){
    assert.equal(await links.first().getAttribute('href'),active[index]);
    const visual=await links.first().evaluate(el=>({background:getComputedStyle(el).backgroundColor,weight:getComputedStyle(el).fontWeight}));
    assert.notEqual(visual.background,'rgba(0, 0, 0, 0)',`${route} active contrast`);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} ${route} overflow`);
   const secondary=await page.locator('main>nav a').evaluateAll(items=>items.map(a=>({h:a.getBoundingClientRect().height,w:a.getBoundingClientRect().width})));
   for(const box of secondary)assert.ok(box.h>=44,`${width} ${route} secondary target ${box.h}`);
  }
  await page.goto(base+'/dpa.html');
  const top=await page.locator('#text').evaluate(el=>el.getBoundingClientRect().top+scrollY);
  assert.ok(top<1450,`${width} draft text too deep ${top}`);
  const notice=await page.locator('main').innerText();
  assert.match(notice,/Synthetic test only/);assert.match(notice,/public and permanent/);assert.match(notice,/exact document/);
  assert.match(notice,/verified SDT contract/);
  await page.locator('details.legal-limits summary').click();assert.match(await page.locator('details.legal-limits').innerText(),/Self-declared SDT does not verify identity/);
  await page.locator('#load').click();
  const feedback=page.locator('#load-feedback');
  assert.match(await feedback.innerText(),/Error:.*Connect wallet|Error:.*address/i);
  assert.equal(await feedback.getAttribute('role'),'alert');
  assert.equal(await feedback.evaluate(el=>document.activeElement===el||document.activeElement?.getAttribute('aria-invalid')==='true'),true,'action summary or field focused');
  const near=await feedback.evaluate(el=>Math.abs(el.getBoundingClientRect().top-document.querySelector('#load').getBoundingClientRect().bottom));
  assert.ok(near<130,`load feedback far from button ${near}`);
  assert.ok(await page.locator('#status').isVisible());
  const focus=await page.locator('#load').evaluate(el=>{el.focus();let s=getComputedStyle(el);return {outline:s.outlineColor,bg:s.backgroundColor}});
  await page.keyboard.press('Tab');
  const pairs=await page.evaluate(()=>{
   const targets=[document.querySelector('.site-header .brand'),document.querySelector('#load'),document.querySelector('main>nav a'),document.querySelector('details.legal-limits summary')];
   return targets.map(el=>{el.focus();const s=getComputedStyle(el);let parent=el.parentElement;while(parent&&getComputedStyle(parent).backgroundColor==='rgba(0, 0, 0, 0)')parent=parent.parentElement;return {outline:s.outlineColor,background:getComputedStyle(parent||document.body).backgroundColor}});
  });
  const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
  const lum=s=>rgb(s).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
  const ratios=pairs.map(pair=>{const a=lum(pair.outline),b=lum(pair.background);return Number(((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2))});
  for(const ratio of ratios)assert.ok(ratio>=3,`${width} focus contrast ${ratio}`);
  for(const route of ['/shares.html','/sale.html']){
   await page.goto(base+route);await page.locator('#load').click();
   assert.match(await page.locator('#load-feedback').innerText(),/Connect wallet first/);
   assert.equal(await page.locator('#load-feedback').getAttribute('role'),'alert');
   assert.ok(await page.locator('#load-feedback').evaluate(el=>Math.abs(el.getBoundingClientRect().top-document.querySelector('#load').getBoundingClientRect().bottom))<130);
  }
  measurements.push({width,draftTextY:top,secondaryTargets:'>=44',focusContrast:ratios,loadFeedbackDistance:near});
  await page.close();
 }
 console.log(JSON.stringify({routes:routes.length,widths:3,measurements},null,2));
}finally{await browser.close()}
