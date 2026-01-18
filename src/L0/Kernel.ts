
import { createHash } from 'crypto';

// --- Identity ---
export type PrincipalId = string; // DID or UUID
export type Signature = string;

export interface Principal {
    id: PrincipalId;
    publicKey: string;
}

// --- Time ---
export interface TimeSource {
    now(): number;
}

export class SystemTime implements TimeSource {
    now(): number {
        return Date.now();
    }
}

export class LogicalTimestamp {
    constructor(public readonly time: number, public readonly logical: number) { }

    toString(): string {
        return `${this.time}:${this.logical}`;
    }

    static fromString(s: string): LogicalTimestamp {
        const [time, logical] = s.split(':').map(Number);
        return new LogicalTimestamp(time, logical);
    }
}

export class DeterministicTime {
    private lastTime = 0;
    private logicalTick = 0;
    private source: TimeSource;

    constructor(source: TimeSource = new SystemTime()) {
        this.source = source;
    }

    public getNow(): LogicalTimestamp {
        const currentWall = this.source.now();

        if (currentWall > this.lastTime) {
            this.lastTime = currentWall;
            this.logicalTick = 0;
        } else if (currentWall === this.lastTime) {
            this.logicalTick++;
        } else {
            // Clock moved backwards, freeze logical time forward by incrementing tick relative to lastTime
            this.logicalTick++;
        }

        return new LogicalTimestamp(this.lastTime, this.logicalTick);
    }
}

// --- Invariant ---
export class InvariantViolation extends Error {
    constructor(message: string) {
        super(`[L0-INVARIANT-VIOLATION] ${message}`);
        this.name = 'InvariantViolation';
    }
}

export class InvariantEngine {
    public static assert(condition: boolean, message: string): void {
        if (!condition) {
            throw new InvariantViolation(message);
        }
    }

    public static assertNotNull<T>(value: T | null | undefined, message: string): T {
        if (value === null || value === undefined) {
            throw new InvariantViolation(message);
        }
        return value;
    }
}

// --- Evidence ---
export interface Evidence<T = any> {
    payload: T;
    signatory: PrincipalId;
    signature: Signature;
    timestamp: string; // LogicalTimestamp string
}

// --- Ledger ---
export interface LedgerEntry {
    hash: string;
    previousHash: string;
    evidence: Evidence;
}

export class AuditLedger {
    private chain: LedgerEntry[] = [];
    private genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';

    constructor() { }

    public append(evidence: Evidence): LedgerEntry {
        const previousHash = this.chain.length > 0 ? this.chain[this.chain.length - 1].hash : this.genesisHash;
        const hash = this.calculateHash(previousHash, evidence);

        const entry: LedgerEntry = {
            hash,
            previousHash,
            evidence
        };

        this.chain.push(entry);
        return entry;
    }

    public getHistory(): LedgerEntry[] {
        return [...this.chain]; // Return copy to preserve apparent immutability
    }

    public verifyIntegrity(): boolean {
        for (let i = 0; i < this.chain.length; i++) {
            const entry = this.chain[i];
            const prevHash = i === 0 ? this.genesisHash : this.chain[i - 1].hash;

            // 1. Check Link
            if (entry.previousHash !== prevHash) return false;

            // 2. Check Hash
            const calculated = this.calculateHash(prevHash, entry.evidence);
            if (entry.hash !== calculated) return false;
        }
        return true;
    }

    private calculateHash(prevHash: string, evidence: Evidence): string {
        const data = prevHash + JSON.stringify(evidence);
        return createHash('sha256').update(data).digest('hex');
    }
}
