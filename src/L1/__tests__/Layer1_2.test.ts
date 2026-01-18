
import { AuditLedger, DeterministicTime, Principal } from '../../L0/Kernel';
import { MetricRegistry, MetricType, StateModel, EvidenceGenerator } from '../../L1/Truth';
import { TrendAnalyzer } from '../../L2/Prediction';

describe('L1 Truth & L2 Prediction', () => {
    let ledger: AuditLedger;
    let time: DeterministicTime;
    let registry: MetricRegistry;
    let state: StateModel;
    let predictor: TrendAnalyzer;
    const admin: Principal = { id: 'admin', publicKey: 'key' };

    beforeEach(() => {
        ledger = new AuditLedger();
        time = new DeterministicTime();
        registry = new MetricRegistry();
        state = new StateModel(ledger, registry);
        predictor = new TrendAnalyzer(state);

        registry.register({
            id: 'system.load',
            description: 'System Load Average',
            type: MetricType.GAUGE
        });
    });

    describe('L1 Truth', () => {
        test('should update state from evidence', () => {
            const ev = EvidenceGenerator.create('system.load', 0.5, admin, time.getNow());
            state.apply(ev);

            expect(state.get('system.load')).toBe(0.5);
            expect(ledger.getHistory().length).toBe(1);
        });

        test('should maintain history', () => {
            state.apply(EvidenceGenerator.create('system.load', 0.5, admin, time.getNow()));
            state.apply(EvidenceGenerator.create('system.load', 0.6, admin, time.getNow()));

            const history = state.getHistory('system.load');
            expect(history.length).toBe(2);
            expect(history[0].value).toBe(0.5);
            expect(history[1].value).toBe(0.6);
        });
    });

    describe('L2 Prediction', () => {
        test('should forecast linear trend', () => {
            // Seed 0, 10, 20, 30...
            state.apply(EvidenceGenerator.create('system.load', 0, admin, time.getNow()));
            state.apply(EvidenceGenerator.create('system.load', 10, admin, time.getNow()));
            state.apply(EvidenceGenerator.create('system.load', 20, admin, time.getNow()));

            // Predict next step (horizon 1)
            // Sequence: 0, 10, 20. Next should be 30.
            const forecast = predictor.forecast('system.load', 1);

            expect(forecast).not.toBeNull();
            expect(forecast!.predictedValue).toBeCloseTo(30);
        });

        test('should calculate confidence bands', () => {
            // Perfect line -> 0 deviation
            state.apply(EvidenceGenerator.create('system.load', 0, admin, time.getNow()));
            state.apply(EvidenceGenerator.create('system.load', 10, admin, time.getNow()));

            const forecast = predictor.forecast('system.load', 1);
            expect(forecast!.confidenceHigh).toBeCloseTo(20);
            expect(forecast!.confidenceLow).toBeCloseTo(20);

            // Noisy data
            state.apply(EvidenceGenerator.create('system.load', 22, admin, time.getNow())); // Should be 20

            const noisyForecast = predictor.forecast('system.load', 1);

            expect(noisyForecast!.confidenceHigh).toBeGreaterThan(noisyForecast!.confidenceLow);
        });
    });
});
