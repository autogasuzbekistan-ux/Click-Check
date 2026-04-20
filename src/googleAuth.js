require('dotenv').config();
const { google } = require('googleapis');
const vision = require('@google-cloud/vision');

/**
 * Loads Google service account credentials. Priority:
 *  1. GOOGLE_SERVICE_ACCOUNT_BASE64  — base64-encoded JSON (best for Railway)
 *  2. GOOGLE_APPLICATION_CREDENTIALS — local file path (local dev)
 */
function getCredentials() {
  const b64raw = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  if (b64raw) {
    // Strip ALL whitespace (spaces, newlines, tabs) — clipboard often adds them
    const b64 = b64raw.replace(/\s/g, '');
    const bytes = Buffer.from(b64, 'base64');

    const logger = require('./logger');
    logger.info(`BASE64 length: ${b64.length}, decoded bytes: ${bytes.length}`);
    logger.info(`First 20 bytes hex: ${bytes.slice(0, 20).toString('hex')}`);

    // Try UTF-8
    try {
      const json = bytes.toString('utf8').replace(/^\uFEFF/, '');
      const creds = JSON.parse(json);
      logger.info('Credentials loaded via UTF-8');
      return creds;
    } catch (_) {}

    // Try UTF-16 LE (Windows default encoding)
    try {
      const json = bytes.toString('utf16le').replace(/^\uFEFF/, '');
      const creds = JSON.parse(json);
      logger.info('Credentials loaded via UTF-16 LE');
      return creds;
    } catch (_) {}

    throw new Error(
      `GOOGLE_SERVICE_ACCOUNT_BASE64 o'qib bo'lmadi. ` +
      `decoded_bytes=${bytes.length}, hex_start=${bytes.slice(0, 8).toString('hex')}`
    );
  }
  return null;
}

async function getSheetsClient() {
  const credentials = getCredentials();
  const auth = credentials
    ? new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      })
    : new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
  return google.sheets({ version: 'v4', auth });
}

function getVisionClient() {
  const credentials = getCredentials();
  if (credentials) return new vision.ImageAnnotatorClient({ credentials });
  return new vision.ImageAnnotatorClient();
}

module.exports = { getSheetsClient, getVisionClient };
