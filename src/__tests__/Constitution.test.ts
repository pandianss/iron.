
import { jest, describe, test, expect, beforeEach, beforeAll } from '@jest/globals';

// --- Mocks for Outer Layers ---
jest.unstable_mockModule('../L2/State.js', () => ({
    StateModel: jest.fn().mockImplementation(() => ({
        validateMutation: jest.fn(),
        applyTrusted: jest.fn(),
        get: jest.fn()
    })),
    MetricRegistry: jest.fn().mockImplementation(() => ({
        get: jest.fn()
    })),
}));

jest.unstable_mockModule('../L4/Protocol.js', () => ({
    ProtocolEngine: jest.fn().mockImplementation(() => ({
        isRegistered: jest.fn().mockReturnValue(true),
        evaluate: jest.fn().mockReturnValue([])
    }))
}));

// --- Real Inner Layers (The Core) ---
import { GovernanceKernel } from '../Kernel.js';
import { IdentityManager, DelegationEngine } from '../L1/Identity.js';
import { CapabilitySet, CapabilityAlgebra } from '../L1/Identity.js'; // Ensure these are exported/usable
import { AuditLog } from '../L5/Audit.js';
import { Budget, BudgetType } from '../L0/Kernel.js';
import { generateKeyPair, signData, hash } from '../L0/Crypto.js';
import type { Intent } from '../L2/State.js';

describe('The CONSTITUTION (Supreme Court Verification)', () => {
    let kernel: GovernanceKernel;
    let identity: IdentityManager;
    let delegation: DelegationEngine;
    let audit: AuditLog;

    // Mocks
    let mockState: any;
    let mockProtocols: any;
    let mockRegistry: any;

    const rootKeys = generateKeyPair();
    const userKeys = generateKeyPair();
    const malloryKeys = generateKeyPair(); // Attacker

    let testTime = 1000000;
    const realNow = Date.now;

    beforeAll(() => {
        global.Date.now = () => testTime;
    });

    afterAll(() => {
        global.Date.now = realNow;
    });

    beforeEach(async () => {
        testTime += 1000; // Increment for each test setup
        // Reset Modules
        const StateModule = await import('../L2/State.js');
        const ProtocolModule = await import('../L4/Protocol.js');

        mockState = new StateModule.StateModel();
        mockRegistry = new StateModule.MetricRegistry();
        mockProtocols = new ProtocolModule.ProtocolEngine();

        // Real Logic
        audit = new AuditLog();
        identity = new IdentityManager();
        delegation = new DelegationEngine(identity);

        // Register ROOT
        identity.register({
            id: 'ROOT',
            publicKey: rootKeys.publicKey,
            type: 'INDIVIDUAL',
            // Capability Set construction manually matching Ontology
            scopeOf: new CapabilitySet([{ action: '*', resource: '*' }]),
            isRoot: true,
            createdAt: '0:0'
        });

        // Register USER
        identity.register({
            id: 'user',
            publicKey: userKeys.publicKey,
            type: 'INDIVIDUAL',
            scopeOf: new CapabilitySet([{ action: 'METRIC.WRITE', resource: 'user.data' }]),
            createdAt: '0:0'
        });

        kernel = new GovernanceKernel(
            identity,
            delegation,
            mockState,
            mockProtocols,
            audit,
            mockRegistry
        );

        kernel.boot();

        // DELEGATE POWER (Root -> User)
        kernel.grantDelegation('ROOT', 'ROOT', 'user', ['METRIC.WRITE:user.data'], 9999999999);
    });

    const createIntent = (principal: string, keys: any, metric: string, val: any, ts: string = '1000:0') => {
        const payload = { metricId: metric, value: val };
        const id = hash(`${principal}:${metric}:${ts}`);
        // MATCH Guards.ts: `${intent.intentId}:${intent.principalId}:${JSON.stringify(intent.payload)}:${intent.timestamp}:${intent.expiresAt}`
        const data = `${id}:${principal}:${JSON.stringify(payload)}:${ts}:0`;
        return {
            intentId: id,
            principalId: principal,
            payload,
            timestamp: ts,
            expiresAt: '0',
            signature: signData(data, keys.privateKey)
        } as Intent;
    };

    // --- III. Authority Law ---
    test('Law I (Authority): Signature Forgery is Impossible', () => {
        kernel.boot();

        // Mallory masquerades as User
        const fakeIntent = createIntent('user', malloryKeys, 'user.data', 666);

        const aid = kernel.submitAttempt('attacker', 'proto1', fakeIntent);
        const status = kernel.guardAttempt(aid); // Should reject

        expect(status).toBe('REJECTED');
        // Verify Audit Log reason - SEARCH REVERSE to find REJECT (not ATTEMPT)
        const entry = audit.getHistory().slice().reverse().find(e => e.intent.intentId === fakeIntent.intentId);
        expect(entry).toBeDefined();
        expect(entry?.status).toBe('REJECT');
        expect(entry?.reason).toMatch(/Invalid Signature/);
    });

    test('Law I (Authority): Scope Attenuation Enforcement', () => {
        kernel.boot();

        // User tries to write to ROOT data
        const exceedIntent = createIntent('user', userKeys, 'kernel.root.config', 1);

        const aid = kernel.submitAttempt('user', 'proto1', exceedIntent);
        const status = kernel.guardAttempt(aid);

        expect(status).toBe('REJECTED');
        const entry = audit.getHistory().slice().reverse().find(e => e.intent.intentId === exceedIntent.intentId);
        expect(entry?.status).toBe('REJECT');
        expect(entry?.reason).toMatch(/Insufficient Scope/);
    });

    // --- II. State Law ---
    test('Law II (State): Action requires Active Kernel', () => {
        // Create a NEW kernel that is NOT booted
        const audit2 = new AuditLog();
        const kernel2 = new GovernanceKernel(identity, delegation, mockState, mockProtocols, audit2, mockRegistry);

        const intent = createIntent('user', userKeys, 'user.data', 1);

        expect(() => {
            kernel2.submitAttempt('user', 'proto1', intent);
        }).toThrow(/Cannot submit attempt in state CONSTITUTED/);
    });

    // --- III. Economic Law ---
    test('Law III (Economics): Budget is Finite', () => {
        kernel.boot();
        const intent = createIntent('user', userKeys, 'user.data', 1);
        const aid = kernel.submitAttempt('user', 'proto1', intent, 50); // Cost 50
        kernel.guardAttempt(aid); // Accept

        const tinyBudget = new Budget(BudgetType.ENERGY, 40); // Have 40

        expect(() => {
            kernel.commitAttempt(aid, tinyBudget);
        }).toThrow(/Budget Violation/);
    });

    // --- IV. Truth & Time Law ---
    test('Law IV (Truth): Time is Monotonic', async () => {
        // testTime is already at some point X from beforeEach
        const startTs = testTime;

        const i1 = createIntent('user', userKeys, 'user.data', 1, `${startTs}:0`);
        const aid1 = kernel.submitAttempt('user', 'proto1', i1);
        kernel.guardAttempt(aid1);
        kernel.commitAttempt(aid1, new Budget(BudgetType.ENERGY, 100)); // Writes to Audit

        // Move time BACKWARDS
        testTime = startTs - 500;

        const i2 = createIntent('user', userKeys, 'user.data', 2, `${testTime}:0`);
        // submitAttempt should fail IMMEDIATELY because AuditLog enforces monotonicity
        expect(() => {
            kernel.submitAttempt('user', 'proto1', i2);
        }).toThrow(/Temporal integrity breached/);
    });

    // --- V. Identity Lifecycle Law ---
    test('Law V (Identity): Revoked Identity has Zero Power', () => {
        kernel.boot();

        // Revoke user
        kernel.revokeIdentity('ROOT', 'user');

        const intent = createIntent('user', userKeys, 'user.data', 1);

        const aid = kernel.submitAttempt('user', 'proto1', intent);
        const status = kernel.guardAttempt(aid);

        expect(status).toBe('REJECTED');
        const entry = audit.getHistory().slice().reverse().find(e => e.intent.intentId === intent.intentId);
        expect(entry?.reason).toMatch(/Principal revoked/);
    });
});
