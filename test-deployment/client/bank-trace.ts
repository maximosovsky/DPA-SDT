// The finite fictional fixture is local-only; SDT commitments bind all thirteen fields.
export const SYNTHETIC_BANK_TRACE = Object.freeze({
 bankName:'Fictional Test Bank',
 bankBic:'TESTUS00XXX',
 bankAccountNumber:'TEST-ACCOUNT-0001',
 bankDate:'2026-01-15',
 bankTime:'12:30',
 bankTimezone:'UTC+00:00',
 bankAmount:'100.00',
 bankCurrency:'USD',
 bankRecipient:'Synthetic Recipient'
});
export type BankTrace = typeof SYNTHETIC_BANK_TRACE;
export function requireSyntheticBankTrace(value:Record<string,string>):void {
 for(const [key,expected] of Object.entries(SYNTHETIC_BANK_TRACE)) {
  if(value[key]!==expected) throw Error(`Only the exact synthetic banking trace is allowed (${key}); no real account or transaction data`);
 }
}
