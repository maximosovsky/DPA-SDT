type Field = HTMLInputElement|HTMLTextAreaElement;
/** Keep the canonical status while putting failures beside the action that caused them. */
export function actionFeedback(trigger:Element|null,text?:string){
 document.querySelectorAll<HTMLElement>('.action-feedback').forEach(el=>el.remove());
 if(!text)return;
 const control=trigger?.closest('button,input[type="file"]')??trigger;
 if(!control)return;
 const feedback=document.createElement('p');
 feedback.className='action-feedback';feedback.id=`${control.id}-feedback`;
 feedback.setAttribute('role','alert');feedback.tabIndex=-1;feedback.textContent=text;
 control.insertAdjacentElement('afterend',feedback);
 feedback.focus({preventScroll:true});feedback.scrollIntoView({block:'nearest'});
 const invalid=document.querySelector<HTMLInputElement|HTMLTextAreaElement>('[aria-invalid="true"]');
 if(invalid){invalid.focus({preventScroll:true});invalid.scrollIntoView({block:'nearest'});}
}

/** Pair a local validation error with its control while retaining the page status. */
export function fieldError(field:Field, message:string){
 clearFieldError(field);
 const hint=document.createElement('span');hint.className='field-error';hint.id=`${field.id}-error`;hint.textContent=message;
 field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby',hint.id);
 field.insertAdjacentElement('afterend',hint);field.focus();
}
export function clearFieldError(field:Field){
 field.removeAttribute('aria-invalid');field.removeAttribute('aria-describedby');
 document.getElementById(`${field.id}-error`)?.remove();
}
export function clearFieldErrors(){document.querySelectorAll<Field>('input[aria-invalid="true"],textarea[aria-invalid="true"]').forEach(clearFieldError)}
export function firstInvalidField(ids:string[],message:string){
 const field=ids.map(id=>document.getElementById(id)).find(el=>el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement) as Field|undefined;
 if(field)fieldError(field,message);
}
