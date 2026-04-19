require('dotenv').config();
const { google } = require('googleapis');
const vision = require('@google-cloud/vision');

/**
 * Parses Google service account credentials from either:
 * 1. GOOGLE_SERVICE_ACCOUNT_JSON env var (Railway / production)
 * 2. GOOGLE_APPLICATION_CREDENTIALS file path (local dev)
 */
function getCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  // Try parsing as-is first
  try {
    return JSON.parse(raw);
  } catch (_) {}

  // Railway sometimes escapes \n inside private_key as \\n — fix it
  try {
    const fixed = raw.replace(/\\\\n/g, '\\n');
    return JSON.parse(fixed);
  } catch (_) {}

  // Last resort: replace literal newlines inside the string with \n
  try {
    const fixed = raw.replace(/\n/g, '\\n');
    return JSON.parse(fixed);
  } catch (_) {}

  throw new Error(
    'GOOGLE_SERVICE_ACCOUNT_JSON o\'qib bo\'lmadi. ' +
    'Railway Variables da to\'g\'ri JSON formatda kiritilganini tekshiring.'
  );
}

/**
 * Returns an authenticated Google Sheets client.
 */
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

/**
 * Returns an authenticated Google Vision ImageAnnotatorClient.
 */
function getVisionClient() {
  const credentials = getCredentials();

  if (credentials) {
    return new vision.ImageAnnotatorClient({ credentials });
  }
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var (local dev)
  return new vision.ImageAnnotatorClient();
}

module.exports = { getSheetsClient, getVisionClient };
