require('dotenv').config();
const { google } = require('googleapis');
const vision = require('@google-cloud/vision');

/**
 * Builds credentials object from individual Railway env vars.
 * Supports two modes:
 *   1. Individual vars: GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY (recommended for Railway)
 *   2. Full JSON: GOOGLE_SERVICE_ACCOUNT_JSON (fallback)
 *   3. File path: GOOGLE_APPLICATION_CREDENTIALS (local dev)
 */
function normalizePrivateKey(raw) {
  let key = raw.trim();

  // Strip accidental surrounding quotes
  if ((key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // Strip trailing comma (common copy-paste mistake from JSON)
  key = key.replace(/,\s*$/, '');

  // Convert literal \n sequences → real newlines (if not already newlines)
  if (!key.includes('\n')) {
    key = key.replace(/\\n/g, '\n');
  }

  return key;
}

function getCredentials() {
  // Mode 1: individual env vars (most reliable on Railway)
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
    return {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID || '',
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID || '',
      private_key: privateKey,
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
    };
  }

  // Mode 2: full JSON string
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    // Try as-is
    try { return JSON.parse(raw); } catch (_) {}
    // Fix double-escaped newlines
    try { return JSON.parse(raw.replace(/\\\\n/g, '\\n')); } catch (_) {}
    // Fix literal newlines outside of key value
    try { return JSON.parse(raw.replace(/\n/g, '\\n')); } catch (_) {}

    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_JSON o\'qib bo\'lmadi.\n' +
      'Iltimos GOOGLE_CLIENT_EMAIL va GOOGLE_PRIVATE_KEY ni alohida kiriting.'
    );
  }

  // Mode 3: local file
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
