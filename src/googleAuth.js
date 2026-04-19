require('dotenv').config();
const { google } = require('googleapis');
const vision = require('@google-cloud/vision');

/**
 * Loads Google service account credentials. Priority:
 *  1. GOOGLE_SERVICE_ACCOUNT_BASE64  — base64-encoded JSON (best for Railway)
 *  2. GOOGLE_APPLICATION_CREDENTIALS — local file path (local dev)
 */
function getCredentials() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    try {
      const json = Buffer.from(b64.trim(), 'base64').toString('utf8');
      return JSON.parse(json);
    } catch (err) {
      throw new Error(
        'GOOGLE_SERVICE_ACCOUNT_BASE64 o\'qib bo\'lmadi: ' + err.message
      );
    }
  }
  return null; // falls back to GOOGLE_APPLICATION_CREDENTIALS file
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
