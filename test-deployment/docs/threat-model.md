# Threat model and limitations

| Risk | Tested mitigation / remaining exposure |
|---|---|
| Copied unsalted identity hash | Duplicate mint permitted so attacker cannot globally reserve hash; digest proves no identity, public offline guessing possible. |
| Hostile alternative SDT | DPA immutable trusted SDT constructor address; deployer must verify provenance/code off chain; malicious trusted address itself remains possible. |
| Wallet key sale/loss | Nontransferability applies to token, not key; no recovery or individual attribution. |
| Transfer/burn tampering | ERC-721 transfer and safe transfer fail; only holder can burn; original declaration and DPA snapshot persist. |
| Signature replay/malleability | OpenZeppelin ECDSA recovery; EIP-712 domain actual chain and contract; nonce and one-acceptance guard. |
| Agreement substitution | Typed hash fixed by constructor; verify displayed text against published hash; web deployment can show misleading text if compromised. |
| Signature front-running | Relayer allowed; forged acceptance without holder signature fails. Valid intercepted signature may be relayed before user and still records the same signer/terms; no user-controlled expiry. |
| Network mismatch | Client checks 84532 or 31337 and checks RPC; direct contract execution uses block.chainid. |
| Browser input leakage | Hash is computed locally; no analytics; checked smoke requests. Wallet provider sees public calldata, address and typed signature request. Third-party injected extensions/browser telemetry outside audit scope. |
| Adversarial signature wallet | Only EOA ECDSA supported, no ERC-1271, delegated authority, or reconstruction of historical authorization. |
| Reorg/RPC inconsistency | Receipts and block snapshots recorded locally; public finality/reorg tests not performed. |
| Legal attribution | No authentication, Sybil resistance, banking attribution, legal validity or admissibility guaranteed. |

Prototype only; not professionally audited or formally verified. Do not input genuine personal data even on a test network.
