import type {IdentityV2Fields} from './identity-hash-v2.ts';

// This finite, published test fixture covers all thirteen identity and bank trace fields.
export const SYNTHETIC_FIXTURE: Readonly<IdentityV2Fields> = Object.freeze({
 fullName:'Synthetic Alice',dateOfBirth:'02.03.1990',passportNumber:'TEST-0001',bankTransactionId:'SYNTH-BANK-1',
 bankName:'Fictional Test Bank',bankBic:'TESTUS00XXX',bankAccountNumber:'TEST-ACCOUNT-0001',
 bankDate:'2026-01-15',bankTime:'12:30',bankTimezone:'UTC+00:00',bankAmount:'100.00',bankCurrency:'USD',bankRecipient:'Synthetic Recipient'
});
export function requireSyntheticFixture(fields:IdentityV2Fields):void {
 if(Object.keys(SYNTHETIC_FIXTURE).some(key=>fields[key as keyof IdentityV2Fields]!==SYNTHETIC_FIXTURE[key as keyof IdentityV2Fields]))throw Error('Only the exact synthetic fixture is allowed; no real identity or banking data');
}