# IRON Constitution

**(Closed Governance Operating System)**

## Preamble — Purpose and Closure

IRON is a closed governance operating system. It exists to make authority, obligation, and accountability mechanically enforceable for individuals and enterprises.

IRON is correct if and only if:
1. All authority flows from identity.
2. All effects pass through the kernel.
3. All state change is logged.
4. No protocol can govern IRON itself.

IRON SHALL be recognized as a constitutional machine. It is not a framework for development, but a law for execution. Every implementation SHALL be bound by this Constitution without exception.

---

## Article I — Constitutional Objects

### Section 1.1 — Constitutional Enumeration
The IRON system SHALL consist of exactly the following constitutional objects:
1. **The Kernel** (Executive Authority)
2. **The Identity System** (Principal Algebra)
3. **The Governed Truth** (State Materialization)
4. **The Execution Law** (Formal Sequence)
5. **The Protocol Capability Constitution** (Boundary Law)
6. **The Invariant Set** (Non-Negotiable Properties)

No other object, layer, service, or authority SHALL possess governing power within IRON.

### Section 1.2 — Supremacy and Exhaustiveness
In case of conflict between any system element and a constitutional object, the constitutional object SHALL prevail. No additional governing object, power surface, or authority source SHALL be introduced beyond those enumerated. Any implementation admitting models not permitted by these objects is non-compliant.

---

## Article II — The Kernel

### Section 2.1 — Sole Executive Authority
The kernel is the constitutional core of IRON and SHALL be the sole executive authority within the system. All governance, execution, and state transition SHALL be mediated exclusively by the kernel.

### Section 2.2 — Exclusivity of Power
The kernel alone SHALL be permitted to:
- Recognize identities and derive authority.
- Generate monotonic time and maintain budgets.
- Install and execute isolated protocols.
- Validate and apply mutations to governed state.
- Append irreversible accountability records.

### Section 2.3 — Kernel Isolation and Integrity
The kernel SHALL operate in isolation, protecting its internal state and execution domain from protocol interference. Any modification of kernel behavior MUST itself be a kernel-governed act.

---

## Article III — Identity and Authority

### Section 3.1 — Constitutional Status of Identity
Identity is a constitutional primitive. All authority, responsibility, and budget SHALL be bound to identities recognized by the kernel. Federated and external principals SHALL be represented exclusively through local Proxy Identities owned and managed by the local kernel. There are no implicit, virtual, or truly external identities within IRON.

### Section 3.2 — Authority as Derivable Property
Authority SHALL NOT be a stored possession; it is a kernel-derived property. The kernel SHALL derive effective authority solely from intrinsic scope, valid delegation, and revocation rules. Root identities established at system genesis SHALL serve as the terminal, non-revocable anchors for all derivation; their initial state MUST conform to the Invariant Set. Revocation is terminal and absorbing—no identity MAY act without currently derivable authority.

### Section 3.3 — Delegation and Non-Escalation
Delegation SHALL be explicit, restrictive, and monotonic. No identity MAY delegate more power than it currently holds. No execution trace SHALL exist in which authority is created or expanded outside kernel-recognized derivation.

---

## Article IV — Governed State and Truth

### Section 4.1 — Constitutional Status of Governed State
Governed state is the totality of information upon which IRON execution, authority, protocol behavior, and mutation validity depend. All governed state SHALL be kernel-owned, kernel-maintained, and kernel-mutated exclusively under the Execution Law. No other form of state may influence governance, authority, execution, or outcomes. Any state influencing system behavior that is not governed state is constitutionally forbidden.

### Section 4.2 — Closed Ontology of Governed State
The ontology of governed state is closed. Governed state SHALL consist exclusively of the following constitutional classes:
- Identity state
- Authority derivation state
- Time state
- Budget state
- Governed resource state
- Protocol-local state
- Attempt and outcome state
- Accountability log state

No additional governed state classes may be introduced. Any system maintaining additional execution-relevant state outside these classes is non-compliant.

### Section 4.3 — Governed Resource Classes
Governed resources SHALL be limited to the following constitutional resource classes:
- Metrics
- Commitments
- Assets
- Access bindings

These classes define the full surface upon which protocols may operate. No protocol may create, observe, or mutate any governed resource outside these classes. Any additional domain constructs SHALL be representable strictly as instances of these classes.

### Section 4.4 — Truth Definition
Truth in IRON SHALL mean the complete kernel state derivable by lawful replay of the accountability log under the Execution Law and Identity Algebra. No external database, cache, index, model, or representation SHALL be authoritative. Any representation not derivable from the accountability log is non-truth.

### Section 4.5 — Log Supremacy
The accountability log SHALL be the sole authoritative record of truth transitions. All governed state at any moment SHALL be exactly the state produced by:
1. Initializing the system from genesis, and
2. Replaying the accountability log deterministically under the Execution Law.

No other reconstruction method is constitutionally admissible. Any state not reconstructible from the log is constitutionally invalid.

### Section 4.6 — No Hidden State
No state, signal, cache, heuristic, model, index, or derived structure may influence kernel behavior, authorization, protocol execution, mutation validity, or commit ordering unless it is either:
1. governed state, or
2. a deterministic derivative of governed state whose complete derivation is logged and reproducible.

Any hidden or non-derivable state constitutes a constitutional violation.

### Section 4.7 — Truth Non-Forking
There SHALL exist exactly one authoritative truth. No system component may maintain parallel truths, shadow truths, speculative authoritative truths, or forked authoritative histories. Simulation outputs SHALL be explicitly non-authoritative. Any mechanism allowing multiple authoritative realities is constitutionally invalid.

### Section 4.8 — Truth and Observation
All authoritative observation of IRON SHALL derive from governed state. No interface, analytics system, or external service SHALL be constitutionally relied upon unless its outputs are derivable from governed state. No decision, guard, or execution path SHALL depend on ungoverned observations.

### Section 4.9 — Protocol State
Protocol-local state SHALL be governed state. Protocol-local state SHALL:
- Be namespaced per protocol
- Be accessible only to the kernel and the owning protocol
- Be mutated only through Commit
- Be fully reconstructible from the accountability log

No protocol-local state may exist outside kernel control.

### Section 4.10 — Formal Binding
All governed state semantics SHALL conform exactly to the formal Kernel State Machine (Annex A) and Identity Algebra (Annex B). Any implementation admitting state models not permitted by those annexes is non-compliant.

### Section 4.11 — Closure Clause
No amendment may introduce new governed state classes, permit hidden execution-relevant state, weaken log supremacy, or permit parallel authoritative truths. Any such amendment constitutes a new system and SHALL NOT be labeled IRON.

---

## Article V — Execution Law

### Section 5.1 — The Mandatory Cycle
Every governance act SHALL progress through the mandatory, ordered sequence:
**Attempt → Guard → Execute → Commit**

### Section 5.2 — Phase Constraints
- **Attempt**: Materialization of intent and binding of terminal identity and time.
- **Guard**: Sole evaluation of authority, budgets, and protocol validity.
- **Execute**: Isolated, deterministic evaluation of protocol logic.
- **Commit**: Atomic application of mutations and accountability binding.

### Section 5.3 — Non-Bypassability
There SHALL exist no code path capable of mutating state outside this law. Rejection MUST be logged, and failure MUST preserve state consistency without side effects.

---

## Article VI — Time, Budgets, and Accountability

### Section 6.1 — Temporal Order
The kernel SHALL be the sole source of monotonic, totally ordered time. Every Attempt, rejection, and Commit SHALL be bound to kernel time.

### Section 6.2 — Constitutional Budgets
Every identity SHALL be bound to a non-negative, kernel-maintained budget. No Attempt SHALL be committed unless sufficient budget exists to cover the action cost. Budgets SHALL NOT underflow. Budgets SHALL NOT be incremented or "refilled" by protocol-proposed mutations; they MAY only be modified through dedicated, kernel-governed Identity Management transitions.

### Section 6.3 — Irreversible Accountability
The kernel SHALL maintain an append-only, cryptographically sealed accountability log. Every state transition MUST be reconstructible from the log. No Commit SHALL occur without a corresponding record.

---

## Article VII — Protocols and Capability Law

### Section 7.1 — Constitutional Boundaries
Protocols are governed computational instruments with no authority or identity. They SHALL execute only within kernel-controlled isolation.

### Section 7.2 — Resource and Mutation Limits
Protocols MAY read or write only kernel-exported resource classes (Metrics, Commitments, Assets, Access, Local State). They SHALL NOT access kernel internals, identity state, or time.

### Section 7.3 — Determinism and Inspectability
Every protocol SHALL be deterministic, total, and statically inspectable. Protocol execution SHALL terminate within mechanical limits defined and enforced by the kernel. Any protocol that fails to terminate or exceeds resource bounds during execution SHALL be terminally rejected. Black-box protocols or those with non-deterministic side effects are constitutionally forbidden.

---

## Article VIII — Closure and Supremacy

### Section 8.1 — Closure Law
The IRON system is closed. No operator MAY create new authority surfaces, bypass execution flow, or modify logs. Any system failing these constraints is NOT IRON.

### Section 8.2 — Interpretation
In cases of conflict, the most restrictive interpretation of this Constitution SHALL prevail. The **Annex A Formal Model** SHALL be the final arbiter of correctness; the Reference Kernel Implementation exists only to realize that model. Mechanical divergence of the implementation from the formal model renders the implementation constitutionally invalid.

---

## Article IX — Amendments and Finality

### Section 9.1 — Admissible Amendments
Only clarifications, formalizations, and corrections of inconsistency are admissible. No amendment MAY expand the governing surface or grant new powers to any component.

### Section 9.2 — Closure Clause
This Constitution establishes the terminal governance boundaries for IRON. It is a standalone constitutional object, fixed and closed.

---

## Annexes — Formal Binding

### Annex A — Formal State Machine
The core execution logic is bound to [Kernel.ts](file:///e:/projects/iron/iron/src/Kernel.ts).

### Annex B — Identity Algebra
The rules of derivation and capability matching are bound to [Identity.ts](file:///e:/projects/iron/iron/src/L1/Identity.ts).

### Annex C — Protocol Capability Constitution
Mutation boundaries are bound to [Protocol.ts](file:///e:/projects/iron/iron/src/L4/Protocol.ts).

### Annex D — Non-Negotiable Invariants
The following invariants SHALL be mechanically enforced:
- **No Unsigned Authority**: Implicit actors are forbidden.
- **No Unauthorized Mutation**: Escaped side-effects are invalid.
- **No Identity Resurrection**: Revocation is eternally terminal.
- **No Log Mutation**: History is immutable and append-only.
- **No Budget Underflow**: Scarcity is mechanically enforced.
- **No Non-Kernel Truth**: State exists only via Commit.

### Annex E — Compliance Contract
Verification of this Constitution SHALL be performed by the [Compliance Suite](file:///e:/projects/iron/iron/src/__tests__/Compliance.test.ts).
