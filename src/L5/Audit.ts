// src/L5/Audit.ts
import { hash } from '../L0/Crypto.js';
import type { Intent } from '../L2/State.js';

// --- Audit Log (Hash Chain) ---
export interface LogEntry {
    hash: string;
    previousHash: string;
    intent: Intent;
    status: 'SUCCESS' | 'FAILURE' | 'ATTEMPT' | 'REJECT' | 'ABORTED';
    reason?: string;
    timestamp: number; // Wall clock time of logging
}

export class AuditLog {
    private chain: LogEntry[] = [];
    private genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';

    public append(intent: Intent, status: 'SUCCESS' | 'FAILURE' | 'ATTEMPT' | 'REJECT' | 'ABORTED' = 'SUCCESS', reason?: string): LogEntry {
        const previousHash = this.chain.length > 0 ? this.chain[this.chain.length - 1]!.hash : this.genesisHash;
        const lastTs = this.chain.length > 0 ? this.chain[this.chain.length - 1]!.timestamp : 0;
        const now = Date.now();

        // IV.2 Temporal Law: Monotonicity
        if (now < lastTs) {
            throw new Error("Audit Violation: Temporal integrity breached (Time moved backwards)");
        }

        const entryHash = this.calculateHash(previousHash, intent, status, now, reason);

        const entry: LogEntry = {
            hash: entryHash,
            previousHash: previousHash,
            intent: intent,
            status: status,
            timestamp: now,
            ...(reason ? { reason } : {})
        };

        this.chain.push(entry);
        return entry;
    }

    public getHistory(): LogEntry[] { return [...this.chain]; }

    // IV.3 Historical Legitimacy
    public verifyChain(): boolean {
        let prev = this.genesisHash;
        let lastTs = 0;

        for (const entry of this.chain) {
            // 1. Linkage Check
            if (entry.previousHash !== prev) return false;

            // 2. Hash Check
            const h = this.calculateHash(prev, entry.intent, entry.status, entry.timestamp, entry.reason);
            if (h !== entry.hash) return false;

            // 3. Time Check
            if (entry.timestamp < lastTs) return false;

            prev = entry.hash;
            lastTs = entry.timestamp;
        }
        return true;
    }

    // Alias for compatibility
    public verifyIntegrity(): boolean { return this.verifyChain(); }

    private calculateHash(prevHash: string, intent: Intent, status: string, timestamp: number, reason?: string): string {
        const data = prevHash + JSON.stringify(intent) + status + timestamp + (reason || '');
        return hash(data);
    }
}
