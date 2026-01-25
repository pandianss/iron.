// src/L0/Crypto.ts
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { sha256 } from '@noble/hashes/sha256';
import { blake3 } from '@noble/hashes/blake3';
import { randomBytes } from 'crypto';

// Configure Sync SHA512 for Ed25519
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// 1.1 Hash Function (SHA-256 for compatibility, Blake3 for State)
export function hash(data: string): string {
    return Buffer.from(sha256(Buffer.from(data, 'utf-8'))).toString('hex');
}

export function hashState(data: Uint8Array): string {
    return Buffer.from(blake3(data)).toString('hex');
}

// 1.2 Digital Signatures (Ed25519)
export type Ed25519PublicKey = string; // Hex encoded
export type Ed25519PrivateKey = string; // Hex encoded
export type Signature = string; // Hex encoded

export interface KeyPair {
    publicKey: Ed25519PublicKey;
    privateKey: Ed25519PrivateKey;
}

export function generateKeyPair(): KeyPair {
    const privateKey = ed.utils.randomPrivateKey();
    const publicKey = ed.getPublicKey(privateKey);
    return {
        publicKey: Buffer.from(publicKey).toString('hex'),
        privateKey: Buffer.from(privateKey).toString('hex')
    };
}

export function signData(data: string, privateKeyHex: string): Signature {
    const signature = ed.sign(Buffer.from(data, 'utf-8'), privateKeyHex);
    return Buffer.from(signature).toString('hex');
}

export function verifySignature(data: string, signature: Signature, publicKeyHex: string): boolean {
    try {
        return ed.verify(
            signature,
            Buffer.from(data, 'utf-8'),
            publicKeyHex
        );
    } catch (e) {
        return false;
    }
}

// 1.3 Randomness
export function randomNonce(bytes: number = 32): string {
    return randomBytes(bytes).toString('hex');
}
