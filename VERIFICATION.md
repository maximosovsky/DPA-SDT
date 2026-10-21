# Publication verification

These checks exercised only the copied publication workspace. No public-network signing or deployment was performed.

| Check | Actual result |
| --- | --- |
| `npm ci --ignore-scripts` | 151 packages added; npm reported zero vulnerabilities. |
| `node --experimental-strip-types --test test/identity-hash-v2.test.ts` | 4 passed; 0 failed. |
| `npm test` | 14 Solidity files compiled using solc 0.8.28; 159 nodejs tests passed and 67 failed. |
| Ten focused contract/provenance test files | 31 passed; 0 failed. |
| First `npm run build`, before compilation | Failed: missing `artifacts/contracts/DPA.sol/DPA.json`. |
| `npm run build`, after compilation | Passed; six pinned artifacts verified; Vite transformed 1349 modules and produced ten HTML pages. |

Focused files: `SDT.test.ts`, `DPA.test.ts`, `DPAFormation.test.ts`, `DPAPackage.test.ts`, `DPAShareLoan.test.ts`, `DPAShareNFT.test.ts`, `DPAShareSale.test.ts`, `DPAShareUnits.test.ts`, `ExclusivePackage.test.ts`, and `ExclusiveProvenance.test.ts`.

The full inherited suite is not green. Its failures include stale root-relative navigation/footer expectations against current relative paths, other UI/copy/browser assertions, and a historical test referencing the deliberately omitted older pilot archive. They are not claimed as fixed. The inherited `test:hash` npm script points at the missing `test/identity-hash.test.ts`; the explicit v2 command is the tested alternative.

Compiler warning: `ExclusiveDPAFormation` constructor parameter and function both use the name `allocations`. Hardhat warns that `hre.network.connect()` is deprecated. Neither warning blocked the focused contract checks or build.

Historical evidence inspection confirmed nine scenario entries and 31 unique receipt hashes matching the final manifest's declared counts. Historical receipts were not freshly fetched from RPC. Byte-level hashes are recorded in `snapshot-manifest.json`; existing evidence content was not rewritten.

Security review scans the entire committed payload for blocked credential/container paths, environment/pickle/key files, private-key PEM blocks, common GitHub/AWS/service token formats, assigned credentials/mnemonics, credential-bearing URLs, literal signing keys, and signed raw transactions. The only deliberate allowlist entries are the standard public Hardhat development mnemonic in three local-only browser scripts and a dummy credential-URL rejection fixture. No operational secrets are allowed. This is a pattern-based review, not a guarantee against every unknown secret format.
