/**
 * In-memory store for pending receipt confirmations.
 * Key: `${userId}_${chatId}`
 * Value: { amount, username, name, groupId, fileUrl, messageId, createdAt }
 *
 * Entries expire after EXPIRY_MS to prevent memory leaks.
 */

const EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

const pending = new Map();

function stateKey(userId, chatId) {
  return `${userId}_${chatId}`;
}

function setPending(userId, chatId, data) {
  const key = stateKey(userId, chatId);
  pending.set(key, { ...data, createdAt: Date.now() });
}

function getPending(userId, chatId) {
  const key = stateKey(userId, chatId);
  const entry = pending.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > EXPIRY_MS) {
    pending.delete(key);
    return null;
  }
  return entry;
}

function deletePending(userId, chatId) {
  pending.delete(stateKey(userId, chatId));
}

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of pending.entries()) {
    if (now - entry.createdAt > EXPIRY_MS) {
      pending.delete(key);
    }
  }
}, EXPIRY_MS);

module.exports = { setPending, getPending, deletePending };
