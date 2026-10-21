import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const pages=['index.html','dpa.html','shares.html','sale.html'];
for(const page of pages){
 test(`${page} links both legal notices and contact in its footer`,()=>{
  const footer=readFileSync(page,'utf8').match(/<footer>\s*([\s\S]*?)<\/footer>/)?.[1];
  assert.ok(footer,'footer exists');
  for(const [path,label] of [['/privacy.html','Privacy Notice'],['/terms.html','Terms of Use'],['/contact.html','Contact']]){
   assert.ok(footer.includes(`href="${path}"`),`${path} missing from footer`);
   assert.ok(footer.includes(label),`${label} missing from footer`);
  }
 });
}
test('Privacy Notice describes actual data flows and uncertain retention without invented assurances',()=>{
 const html=readFileSync('privacy.html','utf8');
 for(const claim of ['Maxim Osovsky','Vercel','IP address','RPC','wallet address','public blockchain','off-chain','HTTPS','local file','export','retention']) assert.ok(html.includes(claim),`missing ${claim}`);
 assert.match(html,/cannot (be )?erased|cannot erase/i);
 assert.doesNotMatch(html,/no data collected|GDPR compliant|never logs|zero data|we do not collect any data/i);
});
test('Terms separate site use from DPA and forbid real inputs or mainnet claims',()=>{
 const html=readFileSync('terms.html','utf8');
 for(const claim of ['Maxim Osovsky','synthetic','testnet','mainnet','identity','bank','wallet','transaction','DPA']) assert.ok(html.includes(claim),`missing ${claim}`);
 assert.match(html,/test ETH/i);
 assert.match(html,/separate.*agreement/i);
 assert.match(html,/no actual identity verification.*universal KYC is provided/i);
 assert.doesNotMatch(html,/guaranteed legal rights|licensed financial|refund guarantee/i);
});
test('Contact offers confirmed operator routes and warns against sensitive material',()=>{
 const html=readFileSync('contact.html','utf8');
 for(const url of ['https://github.com/maximosovsky','https://github.com/maximosovsky?tab=repositories','https://www.linkedin.com/in/osovsky/','https://orcid.org/0009-0004-1594-0940']) assert.ok(html.includes(url),`missing ${url}`);
 assert.match(html,/privacy|support/i);
 assert.match(html,/do not (post|send).*private keys/i);
 assert.doesNotMatch(html,/mailto:|adam\.edu\.kg/i);
});
test('production build publishes every legal route',()=>{
 for(const page of ['privacy.html','terms.html','contact.html']) assert.ok(readFileSync(`dist/${page}`,'utf8').includes('<h1>'),`${page} absent from dist`);
});
test('DPA brief visible warning preserves full legal limits in keyboard-accessible details',()=>{
 const html=readFileSync('dpa.html','utf8');
 const warning=html.match(/<p class="warning">([^<]*)<\/p>/)?.[1];
 const details=html.match(/<details class="legal-limits"><summary>[^<]+<\/summary><p>([^<]+)<\/p><\/details>/)?.[1];
 assert.ok(warning);assert.ok(details);
 assert.match(warning,/synthetic test only/i);
 assert.match(warning,/public and permanent/i);
 assert.match(warning,/exact document/i);
 assert.match(warning,/do not enter.*real personal/i);
 assert.match(details,/wallet addresses.*(linkable|identify)/i);
 assert.match(details,/full text.*not on-chain/i);
 assert.match(details,/not.*(guarantee|ensure).*availability/i);
 assert.match(details,/not.*legal enforceability/i);
 assert.match(details,/Self-declared SDT does not verify identity/i);
 assert.doesNotMatch(details,/No identity, bank, passport or real personal information\./);
});
