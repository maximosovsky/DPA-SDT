import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pages=['index','dpa','shares','sale','privacy','terms','contact'];
const sentence='A service for documenting partnership agreements between crypto wallet holders, with a basis for participant identification and participation-share records.';
const ids:Record<string,string[]>={index:['fullName','dateOfBirth','passportNumber','bankTransactionId','hash','digest','connect','network','sdt','dpa','deploy-sdt','deploy-dpa','mint','tokenId','agreement','accept','inspect','burn','output','export'],dpa:['connect','network','sdt','version','text','document-ref','people','person-0','share-0','person-1','share-1','add-person','ack','preview','draft-preview','export-evidence','deploy','agreement-address','load','invitation','import-evidence','retrieve','terms','progress','token-id','accept','status'],shares:['connect','network','agreement','units','loan','deploy-units','deploy-loan','load','summary','claim','recipient','transfer-units','transfer','approve','counterparty','percent','duration','principal','interest','quote','pledge','offer','position-id','inspect','position','fund','withdraw','repay','cancelLoan','releasePledge','reclaimPledge','claimRepaidCollateral','claimDefault','status'],sale:['connect','network','agreement','units','sale','deploy-sale','load','summary','approve','buyer','amount','price','offer','offer-id','inspect','details','buy','cancel','withdraw','status']};
for(const page of pages){
 test(`${page} keeps legal footer without repeating the homepage mission`,()=>{
   const html=readFileSync(`${page}.html`,'utf8');const footer=html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/)?.[1];
   assert.ok(footer,`footer missing: ${page}`);assert.ok(!footer.includes(sentence),'mission repeated in footer');
   if(page==='index')assert.ok(html.split('</main>')[0].includes(sentence),'homepage mission missing');
   else assert.ok(!html.includes(sentence),'mission repeated off homepage');
   for(const path of ['/privacy.html','/terms.html','/contact.html']) assert.ok(footer.includes(`href="${path}"`),`${path} absent`);
   assert.ok(html.includes('href="/client/site.css"'),'shared design absent');
  });
 if(ids[page])test(`${page} retains original controls and bindings`,()=>{
  const html=readFileSync(`${page}.html`,'utf8');
  for(const id of ids[page]) assert.ok(html.includes(`id="${id}"`),`missing #${id}`);
  assert.ok(html.includes(`src="/client/${{index:'main',dpa:'formation',shares:'shares',sale:'sale'}[page]}.ts"`),'missing entry script');
 });
}
test('workspace actions precede collapsed research and SDT tools remain addressable',()=>{
 const html=readFileSync('index.html','utf8');let previous=html.indexOf('id="workspace-actions"');
 assert.ok(previous>=0,'workspace actions missing');
 for(const phrase of ['Create agreement','Open invitation'])assert.ok(html.includes(phrase),`missing ${phrase}`);
 for(const id of ['what','why','how']){const at=html.indexOf(`id="${id}"`);assert.ok(at>previous,`missing or unordered ${id}`);previous=at;}
 assert.ok(previous<html.indexOf('<details class="legacy" id="sdt-tools">'));
 assert.match(html,/<details class="legacy" id="sdt-tools"><summary>Research &amp; testing · SDT declaration tools<\/summary>/);
 assert.match(readFileSync('shares.html','utf8'),/href="\/#sdt-tools"/);
 assert.match(readFileSync('client/main.ts','utf8'),/location\.hash==='#sdt-tools'[\s\S]*?\.open=true/);
 assert.ok(html.includes('href="/dpa.html"'),'formation CTA absent');
 for(const phrase of ['banking','Self-Declared','rights']) assert.ok(html.includes(phrase),`missing ${phrase}`);
});
