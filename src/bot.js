require('dotenv').config();
const { Telegraf } = require('telegraf');
const logger = require('./logger');
const { initSheets } = require('./sheets');
const { handlePhoto } = require('./handlers/photoHandler');
const { handleCallback } = require('./handlers/callbackHandler');
const {
  handleStart,
  handleHisob,
  handleHisobot,
  handleKunlik,
  handleRol,
} = require('./handlers/commandHandler');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  logger.error('BOT_TOKEN muhit o\'zgaruvchisi topilmadi. .env faylini tekshiring.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ── Commands ──────────────────────────────────────────────────────────────────
bot.start(handleStart);
bot.command('hisob', handleHisob);
bot.command('hisobot', handleHisobot);
bot.command('kunlik', handleKunlik);
bot.command('rol', handleRol);

// ── Photo messages ─────────────────────────────────────────────────────────
bot.on('photo', handlePhoto);

// ── Inline button callbacks ────────────────────────────────────────────────
bot.on('callback_query', handleCallback);

// ── Global error handler ───────────────────────────────────────────────────
bot.catch((err, ctx) => {
  logger.error(`Unhandled bot error for update ${ctx.update?.update_id}: ${err.message}`, err);
});

// ── Startup ────────────────────────────────────────────────────────────────
async function main() {
  try {
    logger.info('Google Sheets ishga tushirilmoqda...');
    await initSheets();

    logger.info('Bot ishga tushirilmoqda...');
    await bot.launch();
    logger.info('Bot muvaffaqiyatli ishga tushdi!');

    // Graceful shutdown
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (err) {
    logger.error(`Bot ishga tushirilmadi: ${err.message}`, err);
    process.exit(1);
  }
}

main();
