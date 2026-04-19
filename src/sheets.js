require('dotenv').config();
const { google } = require('googleapis');
const logger = require('./logger');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_CHECKS = process.env.SHEET_CHECKS || 'Cheklar';
const SHEET_USERS = process.env.SHEET_USERS || 'Users';

let sheetsClient = null;

async function getClient() {
  if (sheetsClient) return sheetsClient;
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

function nowFormatted() {
  return new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
}

function todayFormatted() {
  return new Date().toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' });
}

/**
 * Appends a receipt record to the Cheklar sheet.
 * Row: [Sana, User, Summa, Turi, Guruh]
 */
async function appendCheck({ username, name, amount, groupId, type = 'chek' }) {
  const sheets = await getClient();
  const displayName = username ? `@${username}` : name;
  const values = [[nowFormatted(), displayName, amount, type, String(groupId)]];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_CHECKS}!A:E`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  logger.info(`Appended check: ${displayName} | ${amount} | group ${groupId}`);
}

/**
 * Returns all rows from the Cheklar sheet (excluding header row).
 */
async function getAllChecks() {
  const sheets = await getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_CHECKS}!A2:E`,
  });
  return res.data.values || [];
}

/**
 * Returns the total sum of all checks.
 */
async function getTotalSum() {
  const rows = await getAllChecks();
  return rows.reduce((sum, row) => sum + (parseInt(row[2], 10) || 0), 0);
}

/**
 * Returns the total sum for today (Asia/Tashkent timezone).
 */
async function getTodaySum() {
  const rows = await getAllChecks();
  const today = todayFormatted();
  return rows
    .filter((row) => row[0] && row[0].startsWith(today))
    .reduce((sum, row) => sum + (parseInt(row[2], 10) || 0), 0);
}

// ── Users sheet ──────────────────────────────────────────────────────────────

/**
 * Reads all users from the Users sheet.
 * Returns array of { userId, username, name, groupId, role, createdAt }
 */
async function getAllUsers() {
  const sheets = await getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_USERS}!A2:F`,
  });
  const rows = res.data.values || [];
  return rows.map(([userId, username, name, groupId, role, createdAt]) => ({
    userId: String(userId),
    username: username || '',
    name: name || '',
    groupId: String(groupId),
    role: role || 'user',
    createdAt: createdAt || '',
  }));
}

/**
 * Appends a new user to the Users sheet if not already present.
 * Returns existing or newly created user object.
 */
async function ensureUser({ userId, username, name, groupId }) {
  const users = await getAllUsers();
  const existing = users.find(
    (u) => u.userId === String(userId) && u.groupId === String(groupId)
  );
  if (existing) return existing;

  const adminIds = (process.env.ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  const role = adminIds.includes(String(userId)) ? 'admin' : 'user';

  const sheets = await getClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_USERS}!A:F`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[String(userId), username || '', name || '', String(groupId), role, nowFormatted()]],
    },
  });

  logger.info(`Registered new user: ${userId} (@${username}) in group ${groupId} as ${role}`);
  return { userId: String(userId), username, name, groupId: String(groupId), role, createdAt: nowFormatted() };
}

/**
 * Returns the role for a given userId and groupId.
 * Falls back to checking ADMIN_IDS env var.
 */
async function getUserRole(userId, groupId) {
  const adminIds = (process.env.ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (adminIds.includes(String(userId))) return 'admin';

  const users = await getAllUsers();
  const user = users.find(
    (u) => u.userId === String(userId) && u.groupId === String(groupId)
  );
  return user ? user.role : 'user';
}

/**
 * Updates the role of a user in the Users sheet.
 */
async function setUserRole(userId, groupId, newRole) {
  const sheets = await getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_USERS}!A2:F`,
  });
  const rows = res.data.values || [];

  const rowIndex = rows.findIndex(
    (r) => String(r[0]) === String(userId) && String(r[3]) === String(groupId)
  );
  if (rowIndex === -1) return false;

  // Sheets rows are 1-indexed; data starts at row 2
  const sheetRow = rowIndex + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_USERS}!E${sheetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[newRole]] },
  });

  logger.info(`Updated role: user ${userId} in group ${groupId} → ${newRole}`);
  return true;
}

/**
 * Ensures the required sheet tabs exist with header rows.
 * Call once at startup.
 */
async function initSheets() {
  const sheets = await getClient();

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingTitles = meta.data.sheets.map((s) => s.properties.title);

  const requests = [];

  if (!existingTitles.includes(SHEET_CHECKS)) {
    requests.push({ addSheet: { properties: { title: SHEET_CHECKS } } });
  }
  if (!existingTitles.includes(SHEET_USERS)) {
    requests.push({ addSheet: { properties: { title: SHEET_USERS } } });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests },
    });
  }

  // Write headers if sheets are new or empty
  const checksHeader = [['Sana', 'User', 'Summa', 'Turi', 'Guruh']];
  const usersHeader = [['user_id', 'username', 'name', 'group_id', 'role', 'created_at']];

  const checksRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_CHECKS}!A1`,
  });
  if (!checksRes.data.values) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_CHECKS}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: checksHeader },
    });
  }

  const usersRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_USERS}!A1`,
  });
  if (!usersRes.data.values) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_USERS}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: usersHeader },
    });
  }

  logger.info('Google Sheets initialized successfully');
}

module.exports = {
  appendCheck,
  getAllChecks,
  getTotalSum,
  getTodaySum,
  ensureUser,
  getUserRole,
  setUserRole,
  initSheets,
};
