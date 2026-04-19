/**
 * Extracts the total payment amount from OCR text.
 *
 * Looks for lines containing keywords like TOTAL, SUMMA, JAMI, ИТОГ
 * and parses the numeric value following them.
 *
 * Returns the amount as an integer (e.g. 125000), or null if not found.
 */

const KEYWORDS = ['TOTAL', 'JAMI', 'SUMMA', 'ИТОГ', 'ИТОГО', 'СУММА'];

// Matches numbers like: 125,000 | 125.000 | 125 000 | 125000
const NUMBER_PATTERN = /[\d][,.\s]?[\d]{3}(?:[,.\s]?[\d]{3})*|[\d]+/g;

function normalizeNumber(str) {
  // Remove separators (comma, dot, space used as thousands separator)
  // Handles "125,000" "125.000" "125 000" → 125000
  return parseInt(str.replace(/[,.\s]/g, ''), 10);
}

function extractAmount(ocrText) {
  if (!ocrText) return null;

  const lines = ocrText.split('\n');

  for (const line of lines) {
    const upper = line.toUpperCase();
    const hasKeyword = KEYWORDS.some((kw) => upper.includes(kw));
    if (!hasKeyword) continue;

    const matches = line.match(NUMBER_PATTERN);
    if (!matches || matches.length === 0) continue;

    // Pick the largest number on that line (most likely the total)
    const amounts = matches
      .map(normalizeNumber)
      .filter((n) => !isNaN(n) && n > 0);

    if (amounts.length === 0) continue;

    const amount = Math.max(...amounts);
    if (amount > 0) return amount;
  }

  // Fallback: search the entire text for the largest plausible amount near keywords
  const fullUpper = ocrText.toUpperCase();
  for (const kw of KEYWORDS) {
    const idx = fullUpper.indexOf(kw);
    if (idx === -1) continue;

    // Look at 60 characters after the keyword
    const segment = ocrText.slice(idx, idx + 60);
    const matches = segment.match(NUMBER_PATTERN);
    if (!matches) continue;

    const amounts = matches
      .map(normalizeNumber)
      .filter((n) => !isNaN(n) && n > 0);

    if (amounts.length > 0) return Math.max(...amounts);
  }

  return null;
}

module.exports = { extractAmount };
