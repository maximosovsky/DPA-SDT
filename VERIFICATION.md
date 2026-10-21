# Publication verification

## Current verification (2026-10-21)

Only the copied publication workspace and an isolated fresh checkout were exercised. No public-network signing, deployment, hosting update or wallet operation occurred.

| Check | Actual result |
| --- | --- |
| Fresh `npm ci` | Passed; 151 packages added; zero vulnerabilities reported. |
| `npx playwright install chromium` | Passed; browser tests executed, not skipped. |
| `npm test` | **234 passed / 0 failed** (Hardhat node:test, including Chromium tests and preview subtests); no skipped tests reported. |
| `npm run test:hash` | **4 passed / 0 failed / 0 skipped**; supported thirteen-field v2 suite. |
| Fresh compilation | 14 Solidity files compiled using solc 0.8.28, Cancun target. |
| `npm run build` | Passed; compile then six SHA-256-pinned artifact installs; 1349 Vite modules and ten HTML pages. |
| Focused build/server/preview/typography | 11 passed / 0 failed / 0 skipped; preview at 1280/390/320px, typography on seven routes at 1280/390px. |
| UI preservation | All 15 HTML/CSS source files unchanged by SHA-256; no client components, contracts or evidence edited. |
| Standalone typecheck/lint | No existing tsconfig, typecheck script or ESLint configuration; not claimed. Vite/Hardhat compilation executed. |

Build now compiles every imported contract before pinning deployed artifacts. `pretest` prepares built-page fixtures. `.gitattributes` preserves exact bytes: a real Windows clone initially changed canonical artifacts to CRLF and failed SHA-256; byte-preserving checkout resolves that without changing global Git configuration.

### Exhaustive failure resolution

Original audit: 159 passing / 67 failing. Reproduction with an existing build reached 161 passing / 69 failing because previously blocked preview subtests then ran. These are historical baselines, not current failures.

- Footer/navigation/action/stylesheet expectations assert exact current document-relative links; five ordered labels, active-page states, English copy and controls remain checked.
- SDT selectors use the current `details#sdt-tools`, not a removed class. Historical four-field limits are explicitly checked in Terms; current thirteen-field safety and export disclosures remain checked.
- Built fixtures are generated before tests. Preview and typography use an owned direct Node/Vite child, allocated strict port, bounded readiness, diagnostic propagation and awaited cleanup. Regression tests check another listener survives and child startup failure is reported.
- Typography explicitly preserves scoped legacy SDT buttons at 700 and validation errors at 600; editorial controls retain stricter checks. CSS was not changed.
- Removed non-exclusive archives stay absent. Equivalent tests check current exclusive deployment addresses, allocation and artifact hashes plus all nine published scenarios.
- Evidence checks distinguish 31 unique successful raw receipts from 30 lifecycle receipts by explicitly excluding the single operator-loan deployment hash. Evidence bytes/counts are not rewritten.
- `test:hash` runs the supported v2 filename. Three new command regressions failed before the script fixes, then passed. Two owned-server regressions were added. No tests were removed, disabled or marked skipped; four preview subtests now execute successfully.

Existing non-blocking warnings remain: constructor/getter `allocations` naming and inherited deprecated `hre.network.connect()`. Canonical contracts were not altered to suppress warnings. Gitleaks 8.30.1 (download checksum verified) scanned committed history and final publication payload with redacted reports; additional blocked-path and credential checks were performed. Known public Hardhat mnemonic fixtures in local-only scripts and dummy credential-URL rejection data are intentional, not operational credentials. No operational secrets are allowed.

Historical receipts were not fetched afresh from RPC. `snapshot-manifest.json` remains the immutable initial-publication audit, not a manifest regenerated for this fix.

## Initial publication audit (historical)

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

At the initial audit, the inherited suite was not green. Its failures included stale root-relative navigation/footer expectations against current relative paths, other UI/copy/browser assertions, and a historical test referencing the deliberately omitted older pilot archive. They were not fixed at initial publication; the current fixes are documented above. The initial `test:hash` npm script pointed at the missing `test/identity-hash.test.ts`; the explicit v2 command was the initially tested alternative.

Compiler warning: `ExclusiveDPAFormation` constructor parameter and function both use the name `allocations`. Hardhat warns that `hre.network.connect()` is deprecated. Neither warning blocked the focused contract checks or build.

Historical evidence inspection confirmed nine scenario entries and 31 unique receipt hashes matching the final manifest's declared counts. Historical receipts were not freshly fetched from RPC. Byte-level hashes are recorded in `snapshot-manifest.json`; existing evidence content was not rewritten.

Security review scans the entire committed payload for blocked credential/container paths, environment/pickle/key files, private-key PEM blocks, common GitHub/AWS/service token formats, assigned credentials/mnemonics, credential-bearing URLs, literal signing keys, and signed raw transactions. The only deliberate allowlist entries are the standard public Hardhat development mnemonic in three local-only browser scripts and a dummy credential-URL rejection fixture. No operational secrets are allowed. This is a pattern-based review, not a guarantee against every unknown secret format.
