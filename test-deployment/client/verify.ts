import {verifyHistorical,buildReport,reportHtml,type Verification} from '../src/historical-verify.ts';
import {IDENTITY_V2_FIELDS,type IdentityV2Fields} from '../src/identity-hash-v2.ts';
const $=(id:string)=>document.getElementById(id) as HTMLInputElement;
let current:Verification|null=null,checkedFields:IdentityV2Fields|null=null,epoch=0,activeUrl:string|null=null;
function fields():IdentityV2Fields{return Object.fromEntries(IDENTITY_V2_FIELDS.map(key=>[key,$(key).value])) as IdentityV2Fields;}
function discard(){epoch++;current=null;checkedFields=null;$('result').textContent='';$('export-json').disabled=true;$('export-html').disabled=true;$('include-pii').checked=false;if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl=null;}}
for(const el of document.querySelectorAll('#verification-form input,#verification-form select'))el.addEventListener('input',()=>{discard();$('status').textContent='Input changed; check again.';});
$('clear').onclick=()=>{discard();(document.getElementById('verification-form') as HTMLFormElement).reset();for(const el of document.querySelectorAll<HTMLInputElement>('#verification-form input'))el.value='';$('status').textContent='Inputs and in-memory report cleared. Previously downloaded files must be deleted separately.';};
$('verification-form').addEventListener('submit',async event=>{event.preventDefault();discard();const generation=epoch;try{const provided=fields();$('status').textContent='Checking read-only RPC records…';const result=await verifyHistorical({network:$('network').value,hostname:location.hostname,contract:$('contract').value,wallet:$('wallet').value,transactionHash:$('tx').value,version:'v2',fields:provided});if(generation!==epoch)return;current=result;checkedFields=provided;$('status').textContent=`Current declaration · 13 fields: ${result.status}: ${result.reason}`;$('result').textContent=JSON.stringify(buildReport(result,provided,false),null,2);$('export-json').disabled=false;$('export-html').disabled=false;}catch(error){if(generation===epoch)$('status').textContent=`Invalid input: ${error instanceof Error?error.message:String(error)}`;}});
function download(kind:'json'|'html'){
 if(!current||!checkedFields)return;
 const include=$('include-pii').checked;
 if(include&&!window.confirm('Include all 13 original identity and bank strings in this downloaded file? This creates a sensitive local copy.'))return;
 const report=buildReport(current,checkedFields,include);
 const text=kind==='json'?JSON.stringify(report,null,2):reportHtml(report);
 // No PII is placed in a URL query: ephemeral blob URL is revoked on clear/change and after click.
 const blob=new Blob([text],{type:kind==='json'?'application/json;charset=utf-8':'text/html;charset=utf-8'});
 const url=URL.createObjectURL(blob);activeUrl=url;const a=document.createElement('a');a.href=url;a.download=`declaration-current-13-fields-report.${kind}`;a.click();setTimeout(()=>{URL.revokeObjectURL(url);if(activeUrl===url)activeUrl=null;},0);
 $('include-pii').checked=false;
}
$('export-json').onclick=()=>download('json');$('export-html').onclick=()=>download('html');
