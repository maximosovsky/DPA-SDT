# Test matrix

| Property | Executable test / result |
|---|---|
| Independent SHA256 exact serialization; Unicode, whitespace, order, invalid inputs | `test/identity-hash.test.ts` (Python hashlib vector) |
| SDT mint, duplicate hash, original issuer and burn history, ERC-5192, transfer/safe transfer forbidden, unauthorized burn | `test/SDT.test.ts` |
| DPA holder, wrong token, wrong contract, replay, immutable acceptance snapshot after burn | `test/DPA.test.ts` |
| Wrong signer/chain/agreement version/identity digest/token, independent agreement reuse, burned token rejection | `test/invariants.test.ts` |
| Agreement text SHA256 and typed payload construction | `test/agreement.test.ts` |
| Synthetic local scenario with two identities, relay, replay failure, transfer failure and burn snapshot | `scripts/run-scenario.ts`, local generated scenario output under `artifacts/research/` (not published) |
| Browser local digest, rejected delimiter, absent-wallet state, page errors, outgoing requests | `scripts/browser-smoke.mjs`, `artifacts/browser-smoke.png` |

Gaps: no fuzz/property framework, formal proof, transaction-level RPC fault injection, adversarial trusted SDT replacement test, browser-wallet end-to-end automation, contract-wallet/ERC-1271, network finality/reorg test, storage/metadata API; no third-party audit. On-chain same-wallet second acceptance guarded, no amendments. See threat model. Contract deployment and receipt gas units only from local scenario; no Base Sepolia gas-price/fee/latency results.
