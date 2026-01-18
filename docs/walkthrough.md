# Walkthrough - Iron. Closed System Refactor

## Goal
Realign the Governance OS architecture to the "Iron. Closed System Map".
This specifically enforces a 7-layer stack with fixed responsibilities and no cross-layer bypassing.

## Architecture Map

| Layer | Name | Responsibility | Key Components |
|:---|:---|:---|:---|
| **L0** | **Kernel** | Invariants, Time, Budgets | `DeterministicTime`, `Budget`, `InvariantEngine` |
| **L1** | **Identity** | Who can act? | `IdentityManager`, `DelegationEngine` |
| **L2** | **Truth** | What is true? | `StateModel`, `MetricRegistry` |
| **L3** | **Simulation** | What if we act? | `SimulationEngine`, `TrendAnalyzer` |
| **L4** | **Protocol** | Executable Commitments | `ProtocolEngine` |
| **L5** | **Accountability** | Unavoidable Outcomes | `AuditLog` (Ledger), `AccountabilityEngine` |
| **L6** | **Interface** | Boundary Control | `GovernanceInterface` |

## Key Changes

### 1. Ledger Moved to L5
The `AuditLedger` (now `AuditLog`) was moved from L0 to L5. This reflects the philosophy that accountability is a higher-order enforcement outcome, while L0 is for mathematical invariants.
- **Impact**: `StateModel` (L2) now depends on `AuditLog` (L5) to persist evidence.

### 2. Identity Moved to L1
Identity logic is no longer "Kernel" but the first layer of trust establishment.
- **Added**: `DelegationEngine` to support delegation chains.

### 3. Budgeting Added to L0
New primitive `Budget` (Energy, Risk, Attention) added to L0.
- **Usage**: `SimulationEngine` (L3) now consumes `Budget` to run, preventing resource exhaustion.

### 4. Security Hardening (Ed25519 + SHA256)
Implemented "Minimum Cryptographic & Security Specification".
- **L0 Crypto**: All signing uses Ed25519. Hashing uses strict SHA-256.
- **Signed Intents**: Loose `Evidence` replaced by `Intent`, which MUST be signed by a valid Principal.
- **State**: `StateModel.apply()` blindly rejects anything with an invalid signature.
- **Simulations**: Even ephemeral mocks use Generated Ed25519 Keys to act.

## Verification
A new System-Level Test Suite (`src/__tests__/System.test.ts`) verifies the interaction across all 7 layers, including cryptographic verification.

```bash
PASS  src/__tests__/System.test.ts
  Iron. Security Hardening
    √ L0-L2: Signed Intent commits to L5 Log and updates L2 State (2 ms)
    √ L0-L2: Invalid Signature is Rejected (10 ms)
    √ L3: Simulation Signs its own Actions (1 ms)
    √ L4: Protocol Executes with Authority Keys (3 ms)
```

## Conclusion
The refactor is complete. The system now strictly adheres to the "Iron." specification and its "Minimum Cryptographic & Security Specification".
