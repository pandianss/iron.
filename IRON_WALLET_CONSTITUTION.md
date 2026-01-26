# IRON WALLET: Scope & Boundary Constitution

> **Mandate**: Iron Wallet is a **Personal Continuity and Authority System**. It exists to preserve institutional memory, formalize authority/succession, and enforce continuity protocols.

## 1. The Boundary Laws
All features and roadmap items must survive this filter.

### 1.1 The Positive Constraints (MUST)
*   **Governed Objects Only**: We only store objects wrapped in a Governance Context (Authority, Lifecycle, Evidence, Continuity Rules).
*   **Authority Primacy**: Control structures (Who can do what?) precede convenience features.
*   **Protocolized Continuity**: Everything must have a "Time" component (Expiration, Succession, Review).
*   **Evidence is First-Class**: The *provenance* of an object is as important as the object itself.
*   **Execution over Notification**: The system *does* things (signs, transfers, revokes), it doesn't just *remind* you.

### 1.2 The Negative Constraints (NEVER)
*   **No Arbitrary Storage**: Not a Dropbox. If it doesn't have a continuity rule, it doesn't belong.
*   **No Chat/Comms**: Communication is ephemeral; Iron is permanent.
*   **No Fiat Banking**: We govern *Authority* over assets, not the transaction rails themselves (unless via Extension).
*   **No "Productivity"**: We are not a Todo list. We are an Obligation Engine.
*   **No Kernel Bypassing**: Never hardcode logic that should be in the L4 Kernel protocols.

---

## 2. Core Capabilities (In-Scope)

### 2.1 Identity & Authority (L1)
*   **Sovereign Keys**: Ed25519 Key generation and custody.
*   **Attestation**: Signing "I did this" or "I agree to this".
*   **Delegation**: Granting temporary authority to another Iron Wallet ("Emergency Access").

### 2.2 Continuity & Succession (L2)
*   **Deadman Switch**: "If I don't check in for 30 days, transfer Authority X to Person Y."
*   **Living Will**: Cryptographically enforceable instructions for medical/asset authority.
*   **Critical Vault**: Storage of seed phrases/documents *wrapped* in access protocols (e.g., "Requires 2 of 3 guardians to open").

### 2.3 Evidence & Truth (L3)
*   **Audit Trail**: Immutable log of every login, signature, and delegation.
*   **Proof of Existence**: Hashing documents to prove they existed at Time T.

---

## 3. Approved Evolution Path

1.  **Individual (Now)**: "My Password Manager but for my Legal authority."
2.  **Family (Next)**: "The Family Trust OS." Joint custody, inheritance protocols.
3.  **Organization (Future)**: "The Boardroom." Multi-sig governance of corporate entities.
4.  **Institution (Final)**: "The Sovereign Node." A fully autonomous legal entity.

---

## 4. Scope Rulings (Pre-emptive)

| Feature Proposal | Verdict | Rationale |
| :--- | :--- | :--- |
| **"Add a Chat tab for families"** | **REJECT** | Violates "No Chat". Communication is not Continuity. |
| **"Store family photos"** | **REJECT** | Violates "Governed Objects Only". Use Google Photos. Iron stores the *Will* that assigns the photos. |
| **"Remind me to buy milk"** | **REJECT** | Violates "No Productivity". Not continuity-critical. |
| **"Sign my Child's Permission Slip"** | **APPROVE** | **Authority**. It is an attestation of consent with legal weight. |
| **"Emergency Access to Vault if I'm in hospital"** | **APPROVE** | **Continuity**. Core use case for conditional authority transfer. |
| **"Pay my Netflix bill"** | **REJECT** | Financial Convenience. Not Authority Governance. |
