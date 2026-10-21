<div align="center">

# DPA-SDT

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript)
![Network](https://img.shields.io/badge/Base-Sepolia-0052FF?style=for-the-badge)

**A research prototype for self-declarations, partnership acceptance, and participation-package experiments.**

[Quick Start](#quick-start) · [Evidence](#evidence-and-limitations) · [Provenance](PROVENANCE.md)

</div>

This is a fresh, independent publication snapshot, not a fork and not a new blockchain execution. Source code and the interface retain their existing names, domain separators, attribution, and historical URLs. No hosting changes are made by publishing this repository.

## Features

| Component | Scope |
| --- | --- |
| Self-declared token | Exact, domain-separated SHA-256 commitment to thirteen fictional identity and bank-trace fields; no identity verification. |
| Partnership formation | Off-chain agreement evidence and EOA EIP-712 acceptance with immutable on-chain snapshots. |
| Participation packages | Exclusive ERC-721 issuance, splitting, sale, pledge, and experimental test-ETH loan flows. |
| Interface and tests | Vite/TypeScript pages, Solidity contracts, local Hardhat checks, and preserved research scripts. |

## Quick Start

Requires Node.js >=22.13 and npm. Use only fictional inputs.

```bash
git clone https://github.com/maximosovsky/DPA-SDT.git
cd DPA-SDT/test-deployment
npm ci
npx playwright install chromium
npm test
npm run test:hash
npm run build
npm run dev -- --port 4173 --strictPort
```

Open `http://127.0.0.1:4173/`. Build and test commands compile automatically before installing six pinned deployed artifacts and bundling all imported contracts. No wallet, private key, or RPC credential is required to build the static frontend. Do not run public-network transaction/deployment scripts without separate authorization.

<details>
<summary>Local verification</summary>

`npm test` runs the full suite, including Chromium checks: **234 passing / 0 failing**. `npm run test:hash` executes the supported thirteen-field v2 suite: **4 passing / 0 failing**. Fresh install, automatic compilation and production build are verified; no tests are disabled.

These are local publication checks, not a rerun of the historical Base Sepolia scenarios. See [VERIFICATION.md](VERIFICATION.md).

</details>

## Structure

All project source remains under `test-deployment/`:

- `contracts/`: Solidity 0.8.28 contracts; OpenZeppelin 5.4.0.
- `client/`, `src/`, and HTML pages: Vite 7.3.7, TypeScript 5.9.3, viem 2.57.6.
- `test/`, `scripts/`: Hardhat 3.19.0 and Playwright research checks.
- `canonical-artifacts/`: six exact deployed artifacts checked by SHA-256 before bundling.
- `docs/`: specifications, threat model, test matrix, and retained evidence.

[Source README](test-deployment/README.md) includes current local reproduction commands; historical hosting references and supporting documents remain source-era material, not deployment instructions for this new repository.

## Evidence and limitations

Historical Base Sepolia evidence is preserved byte-for-byte in [published-nine](test-deployment/docs/evidence/base-sepolia/published-nine/) and [exclusive-nft-package](test-deployment/docs/evidence/base-sepolia/exclusive-nft-package/). The final-nine manifest declares nine scenarios and **31 distinct successful receipt hashes**. This does not support silently relabeling the bundle as “30 transactions”; the original evidence remains unchanged.

The recorded provider was a controlled Playwright EIP-1193 test-wallet adapter, not manual MetaMask. Raw evidence retains failed/probe entries and local provenance paths; the final manifest describes subsequent reconciliation. Publication does not newly verify RPC receipts, deploy contracts, establish mainnet/L1 finality, guarantee evidence availability, authenticate a person or bank, or establish enforceable rights. Public unsalted hashes are guessable, not encryption.

Superseded two-party/ERC-1155 and non-exclusive NFT pilot receipt archives are omitted. Their supporting code remains where needed; evidence tests now validate the retained exclusive-package and published-nine manifests, including the explicit 31 raw / 30 lifecycle receipt distinction.

## Attribution and rights

[Maxim Osovsky](https://www.linkedin.com/in/osovsky/). No new license is granted. The source has no repository-wide LICENSE file; contract SPDX `UNLICENSED` notices and existing site-content CC BY 4.0 attribution are preserved. Site-content attribution does not relicense contracts, research text, or third-party dependencies.
