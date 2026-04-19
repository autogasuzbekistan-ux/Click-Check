require('dotenv').config();
const { google } = require('googleapis');
const vision = require('@google-cloud/vision');

/**
 * Parses Google service account credentials from either:
 * 1. GOOGLE_SERVICE_ACCOUNT_JSON env var (Railway / production)
 * 2. GOOGLE_APPLICATION_CREDENTIALS file path (local dev)
 */
function getCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON noto\'g\'ri JSON formatda');
    }
  }
  // Local dev: file path handled automatically by google-auth-library
  return null;
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
