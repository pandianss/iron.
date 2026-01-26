# IRON WALLET: Trust, Security & Legal Doctrine

> **Mandate**: Define the **Doctrines of Credibility** that make Iron Wallet a valid instrument for Personal Governance, Institutional Evidence, and Legal Continuity.
> *Trust is a constitutional layer, not a feature.*

## 1. The Six Pillars of Doctrine

### 1.1 Identity & Authority Trust (Who acts?)
*   **Strong Binding**: Identity is not an email address. It is a cryptographic key-pair (Ed25519) bound to a biological or legal entity via **Attestation**.
*   **Delegation Law**: Authority is never "shared" (password sharing); it is **Delegated**. All delegations must be:
    *   *Explicit* (Signed Intent)
    *   *Scoped* (Specific capabilities)
    *   *Time-Bounded* (Expires automatically)
    *   *Revocable* (By the Sovereign)

### 1.2 Evidence & Legal Defensibility (What is true?)
*   **The Log is Liability**: If it isn't in the Audit Log, it didn't happen. If it is, it is undeniable.
*   **Chain of Custody**: Every object modification must trace back to a Signed Intent.
*   **Admissibility Construction**: Evidence exports must meet technical standards for legal admissibility (e.g., PDF/A-3 w/ embedded XML Signatures, RFC 3161 Time-Stamping).

### 1.3 Security & Cryptographic Posture (Protection)
*   **Zero-Trust Assumptions**: The Server is adversarial. The Cloud is adversarial. Only the Client (Wallet) holds keys.
*   **Separation of Duties**: Custody (Keys) $\neq$ Authority (Rights).
    *   *Example*: Just because you *can* sign (Custody), doesn't mean the contract validates it (Authority).
*   **Coercion Resistance**: The system must support "Duress Modes" (e.g., Panic Passwords that wipe local data or broadcast alarms).

### 1.4 Continuity Risk Governance (Safety)
*   **Deadman's Switch Safety**:
    *   *Doctrine*: "False Positives are Fatal."
    *   *Constraint*: A Declaration of Inactivity/Death requires **Multi-Signal Confirmation** (e.g., Time + Oracle + Trustee Vote), not just "Time passed".
*   **Rollback Law**: Authority transfers triggered by Continuity Protocol are **Provisional** for a "Contestation Period" (e.g., 72 hours) before becoming **Final**.

### 1.5 Consent, Ethics & Misuse (Humanity)
*   **Informed Consent**: Critical Actions (e.g., Transfer of Power) require **High-Friction Confirmation** (Biometrics + PIN + Delay). "Click to Agree" is banned for Governance.
*   **Nominee Protection**: You cannot assign a burden (e.g., Guardianship) to someone without their **Signed Acceptance**.

### 1.6 Institutional & Regulatory Alignment (Integration)
*   **Bank-Grade Audit**: All continuity events must generate a `Compliance_Report` parsable by legacy institutions (Banks, Courts).
*   **Jurisdictional Agnostic**: Logic is "Code Law". It does not enforce Local Law, but produces evidence *consumable* by Local Law.

---

## 2. Kernel Boundary Mapping

| Doctrine | Kernel Primitive (L0-L5) | Constraint |
| :--- | :--- | :--- |
| **Identity Binding** | `IdentityManager` (L1) | Keys must be generated on-device (Secure Enclave). |
| **Delegation Law** | `DelegationEngine` (L1) | No recursive delegation unless explicitly authorized. |
| **Evidence Trace** | `AuditLog` (L5) | Must use `AuditLog.append(SHA256(intent))` for all acts. |
| **Time Safety** | `DeterministicTime` (L0) | No reliable logic on "Client Time". Use Server/Oracle Time. |
| **Risk Checks** | `SimulationEngine` (L3) | Assess "Impact of Death" before strictly enforcing protocols. |

---

## 3. Risk Rulings

| Scenario | Ruling | Rationale |
| :--- | :--- | :--- |
| **User loses Key** | **Social Recovery** | Pure cryptographic loss is catastrophic. We mandate "Social Guardians" (Sharded Keys) for recovery. |
| **User coerced to unlock** | **Duress Mode** | Wallet detects "Duress PIN", opens "Safe Mock Mode", and silently alerts Guardians. |
| **"I didn't sign that"** | **Non-Repudiation** | Impossible if Key was used. We prove *Device Presence* + *Biometric*. Social/Legal layer resolves the rest. |
| **False Death Trigger** | **Provisional Lock** | Assets don't move immediately. "Grace Period" allows the allegedly dead user to override with a single sign-in. |

---

## 4. Minimum Trust Standard
*   **Never** store Private Keys on Iron Servers.
*   **Never** execute a Critical Action without a 2nd Factor or Time Delay.
*   **Always** produce a human-readable "Receipt of Intent" before signing.
