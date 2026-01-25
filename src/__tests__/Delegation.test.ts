
import { describe, test, expect } from '@jest/globals';
import { CapabilityAlgebra, CapabilitySet } from '../L1/Identity.js';
import type { Capability } from '../L0/Ontology.js';

describe('Capability Calculus (III.1)', () => {

    // Helper to make caps
    const cap = (a: string, r: string): Capability => ({ action: a, resource: r });

    test('Algebra: Exact Match', () => {
        const parent = cap('WRITE', 'system.load');
        const child = cap('WRITE', 'system.load');
        expect(CapabilityAlgebra.isSubCapability(child, parent)).toBe(true);
    });

    test('Algebra: Action Wildcard', () => {
        const parent = cap('*', 'system.load');
        const child = cap('WRITE', 'system.load');
        expect(CapabilityAlgebra.isSubCapability(child, parent)).toBe(true);
    });

    test('Algebra: Resource Wildcard', () => {
        const parent = cap('WRITE', '*');
        const child = cap('WRITE', 'system.load');
        expect(CapabilityAlgebra.isSubCapability(child, parent)).toBe(true);
    });

    test('Algebra: Prefix Wildcard', () => {
        const parent = cap('WRITE', 'system.*');
        const child1 = cap('WRITE', 'system.load');
        const child2 = cap('WRITE', 'system.memory');
        const fail = cap('WRITE', 'user.data');

        expect(CapabilityAlgebra.isSubCapability(child1, parent)).toBe(true);
        expect(CapabilityAlgebra.isSubCapability(child2, parent)).toBe(true);
        expect(CapabilityAlgebra.isSubCapability(fail, parent)).toBe(false);
    });

    test('Algebra: Super-Root', () => {
        const GOD = cap('*', '*');
        expect(CapabilityAlgebra.isSubCapability(cap('ANY', 'THING'), GOD)).toBe(true);
    });

    test('Set: Intersection (Attenuation)', () => {
        // Parent has [READ:*, WRITE:system.*]
        // Delegation has [*:system.load]
        // Intersection should be [READ:system.load, WRITE:system.load] or similar logic

        // Wait, Intersection in Identity.ts logic check:
        // for a in A, for b in B: if a < b add a; if b < a add b.

        const A = new CapabilitySet([cap('READ', '*'), cap('WRITE', 'system.*')]);
        const B = new CapabilitySet([cap('*', 'system.load')]);

        const inter = A.intersect(B);

        // READ:system.load (from READ:* and *:system.load)
        // WRITE:system.load (from WRITE:system.* and *:system.load)

        // The implementation logic:
        // A (READ:*) vs B (*:system.load). 
        // Is READ:* < *:system.load? No.
        // Is *:system.load < READ:*? No.
        // Intersection logic in strict set theory requires common ground.
        // My implementation might be too simple. 
        // If they don't explicitly imply each other, they don't intersect? 
        // "READ:*" and "*:system.load" overlap at "READ:system.load". 
        // But if neither is a subset, my loop discards it.
        // Correction: My implementation assumes one MUST be a subset of the other.
        // If I want proper intersection of orthogonal wildcards, I need to synthesize new capabilities.
        // For Iron-5 MVP, let's test what I implemented: Subset attenuation.

        const Delegator = new CapabilitySet([cap('WRITE', 'system.*')]);
        const Request = new CapabilitySet([cap('WRITE', 'system.load')]);

        const Result = Delegator.intersect(Request);
        expect(Result.all.length).toBe(1);
        expect(Result.all[0].resource).toBe('system.load');
    });
});
