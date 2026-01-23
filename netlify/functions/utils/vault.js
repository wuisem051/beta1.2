const CryptoJS = require('crypto-js');

/**
 * Utility for encrypting and decrypting sensitive data
 */
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-secret-key-change-it-in-env';

const encrypt = (text) => {
    if (!text) return text;
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

const decrypt = (ciphertext) => {
    if (!ciphertext) return ciphertext;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        if (!originalText) {
            // If decryption fails to produce UTF8 string, it might not be encrypted or wrong key
            return ciphertext;
        }
        return originalText;
    } catch (e) {
        console.error('Decryption error:', e);
        return ciphertext;
    }
};

module.exports = {
    encrypt,
    decrypt
};
