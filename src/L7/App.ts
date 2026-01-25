import { GovernanceInterface, ActionBuilder } from '../L6/Interface.js';
import type { Ed25519PrivateKey, KeyPair } from '../L0/Crypto.js';

export interface UserSession {
    userId: string;
    keyPair: KeyPair;
    loggedInAt: number;
}

export interface AppDashboard {
    userId: string;
    metrics: Record<string, any>;
    history: {
        action: string;
        timestamp: string;
        proof: string;
    }[];
}

export class SovereignApp {
    private session: UserSession | null = null;

    constructor(
        private gateway: GovernanceInterface
    ) { }

    public login(userId: string, keyPair: KeyPair) {
        this.session = {
            userId,
            keyPair,
            loggedInAt: Date.now()
        };
    }

    public async performAction(
        actionId: string,
        payload: { metricId: string, value: any, protocolId?: string }
    ) {
        if (!this.session) throw new Error("App Error: User unauthenticated");

        // Construct Action using ActionBuilder (Phase 1: Modernization)
        const builder = new ActionBuilder();
        const action = builder
            .withInitiator(this.session.userId)
            .withProtocol(payload.protocolId || 'SYSTEM')
            .withMetric(payload.metricId)
            .withValue(payload.value)
            .build(this.session.keyPair);

        // Execute via Interface (L6)
        const commit = this.gateway.submit(action);

        return {
            actionId,
            txId: commit.attemptId,
            timestamp: commit.timestamp,
            status: commit.status
        };
    }

    public getDashboard(): AppDashboard {
        if (!this.session) throw new Error("App Error: User unauthenticated");

        const metrics = ['reputation', 'standing', 'commitment'];
        const dashboard: AppDashboard = {
            userId: this.session.userId,
            metrics: {},
            history: []
        };

        for (const m of metrics) {
            dashboard.metrics[m] = this.gateway.getTruth(m);
            const trail = this.gateway.getAuditTrail(m);
            dashboard.history.push(...trail.map(t => ({
                action: `UPDATE:${m}`,
                timestamp: t.timestamp,
                proof: t.proof
            })));
        }

        return dashboard;
    }
}
