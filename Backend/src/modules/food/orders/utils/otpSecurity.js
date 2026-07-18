import crypto from 'crypto';
import { config } from '../../../../config/env.js';

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Derive a 32-byte key from the JWT access secret (or fallback)
const getSecretKey = () => {
    const rawSecret = config.jwtAccessSecret || 'default_otp_secret_key_32_bytes_long_fallback';
    return crypto.createHash('sha256').update(rawSecret).digest();
};

/**
 * Encrypts a plain text OTP code.
 * @param {string} text - Plain text OTP
 * @returns {string} - Encrypted cipher text formatted as "iv_hex:cipher_hex"
 */
export function encryptOtp(text) {
    if (!text) return '';
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getSecretKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts an encrypted OTP cipher text.
 * @param {string} encryptedText - Encrypted cipher text formatted as "iv_hex:cipher_hex"
 * @returns {string|null} - Decrypted plain text OTP, or null if failed
 */
export function decryptOtp(encryptedText) {
    if (!encryptedText) return null;
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 2) return null;
        
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        
        const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, getSecretKey(), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        return null;
    }
}
