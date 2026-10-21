import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pages=['index','dpa','shares','sale','privacy','terms','contact'];
const html=Object.fromEntries(pages.map(p=>[p,readFileSync(new URL(`../${p}.html`,import.meta.url),'utf8')]));
test('all published pages offer a keyboard-visible main skip link and matching canvas theme',()=>{
 for(const [page,text] of Object.entries(html)){
  assert.match(text,/<a class="skip-link" href="#main">Skip to main content<\/a>/,page);
  assert.match(text,/<main id="main">/,page);
  assert.match(text,/<meta name="theme-color" content="#f5f7f8">/,page);
 }
 const css=readFileSync(new URL('../client/site.css',import.meta.url),'utf8');
 assert.match(css,/\.skip-link:focus-visible/);
 assert.match(css,/summary:focus-visible/);
});
test('every static or dynamically-created field has a meaningful name and browser hints',()=>{
 for(const p of ['index','dpa','shares','sale']){
  for(const tag of html[p].matchAll(/<(?:input|textarea|select)\b[^>]*>/g)){
   assert.match(tag[0],/\bname="[^"]+"/,`${p}: ${tag[0]}`);
   assert.match(tag[0],/\bautocomplete="off"/,`${p}: ${tag[0]}`);
  }
 }
 const formation=readFileSync(new URL('../client/formation.ts',import.meta.url),'utf8');
 assert.match(formation,/name="person-\$\{count\}"/);
 assert.match(formation,/name="share-\$\{count\}"/);
});
test('drafts warn only when unsaved, with inline field feedback and actionable errors',()=>{
 for(const p of ['main','formation']){
  const code=readFileSync(new URL(`../client/${p}.ts`,import.meta.url),'utf8');
  assert.match(code,/beforeunload/,p);
  assert.match(code,/field-feedback\.ts/,p);
  assert.match(code,/firstInvalidField/,p);
 }
 for(const p of ['shares','sale']){
  const code=readFileSync(new URL(`../client/${p}.ts`,import.meta.url),'utf8');
  assert.match(code,/firstInvalidField/,p);
 }
 const feedback=readFileSync(new URL('../client/field-feedback.ts',import.meta.url),'utf8');
 assert.match(feedback,/aria-invalid/);
 assert.match(feedback,/aria-describedby/);
 assert.match(feedback,/\.focus\(/);
});
