import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const source=fileURLToPath(new URL('../',import.meta.url));
const pages=['index.html','index1.html','dpa.html','shares.html','sale.html','verify.html','privacy.html','terms.html','contact.html'];
const url='https://orcid.org/0009-0004-1594-0940';
for(const [site,root] of [['private',source],...(process.env.PUBLIC_SITE_DIR?[['public',process.env.PUBLIC_SITE_DIR]]:[])]){
  for(const page of pages){
    test(`${site} ${page}: ORCID labels hide ID but links retain exact target`,()=>{
      const html=readFileSync(join(root,page),'utf8');
      const links=[...html.matchAll(/<a\b[^>]*href="(https:\/\/orcid\.org\/[^\"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
      assert.equal(links.length,page==='contact.html'?2:1,'expected ORCID profile links');
      for(const [,href,label] of links){
        assert.equal(href,url);
        assert.equal(label.trim(),'ORCID');
      }
      const visible=html.replace(/<(script|style|head)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]+>/g,'');
      assert.doesNotMatch(visible,/0009-0004-1594-0940|ORCID\s*:/i);
    });
  }
}
