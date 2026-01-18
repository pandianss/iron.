
import { DeterministicTime, InvariantEngine, AuditLedger, Evidence } from '../Kernel';

describe('L0 Governance Kernel', () => {

    describe('Invariant Engine', () => {
        test('should pass when condition is true', () => {
            expect(() => InvariantEngine.assert(true, 'Should pass')).not.toThrow();
        });

        test('should throw InvariantViolation when condition is false', () => {
            expect(() => InvariantEngine.assert(false, 'Should fail')).toThrow('Should fail');
            expect(() => InvariantEngine.assert(false, 'Should fail')).toThrow(/L0-INVARIANT-VIOLATION/);
        });
    });

    describe('Deterministic Time', () => {
        test('should ensure monotonicity', () => {
            const time = new DeterministicTime();
            const t1 = time.getNow();
            const t2 = time.getNow();

            // Even if called instantly, logical tick should increment
            if (t1.time === t2.time) {
                expect(t2.logical).toBeGreaterThan(t1.logical);
            } else {
                expect(t2.time).toBeGreaterThan(t1.time);
            }
        });
    });

    describe('Audit Ledger', () => {
        let ledger: AuditLedger;

        beforeEach(() => {
            ledger = new AuditLedger();
        });

        test('should chain hashes correctly', () => {
            const ev1: Evidence = {
                payload: { action: 'INIT' },
                signatory: 'user-1',
                signature: 'sig-1',
                timestamp: '1000:0'
            };
            const ev2: Evidence = {
                payload: { action: 'UPDATE' },
                signatory: 'user-1',
                signature: 'sig-2',
                timestamp: '1001:0'
            };

            const entry1 = ledger.append(ev1);
            const entry2 = ledger.append(ev2);

            expect(entry1.previousHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
            expect(entry2.previousHash).toBe(entry1.hash);
            expect(ledger.verifyIntegrity()).toBe(true);
        });

        test('should detect tampering', () => {
            const ev1: Evidence = { payload: 'valid', signatory: 'me', signature: 'sig', timestamp: '0:0' };
            ledger.append(ev1);
            const history = ledger.getHistory();

            // Tamper with history (simulate storage corruption or attack)
            // Note: getHistory returns a shallow copy of the array, but objects are mutable.
            // In a real strict kernel, we'd deep freeze.
            history[0].evidence.payload = 'tampered';

            // Actually, since getHistory returns the array, and we modified the object inside it which IS the object in the ledger class (passed by ref),
            // wait... `ev1` object was passed in.

            // Let's modify the internal evidence object if we can access it via the array.
            // Typescript private is only compile time.

            expect(ledger.verifyIntegrity()).toBe(false);
        });
    });
});
