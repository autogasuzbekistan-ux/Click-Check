const { appendCheck } = require('../sheets');
const { getPending, deletePending } = require('../state');
const logger = require('../logger');

/**
 * Handles inline button callbacks: confirm_<userId> and deny_<userId>
 */
async function handleCallback(ctx) {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData) return;

  const { from, chat } = ctx.callbackQuery.message
    ? { from: ctx.callbackQuery.from, chat: ctx.callbackQuery.message.chat }
    : {};

  if (!from || !chat) {
    await ctx.answerCbQuery();
    return;
  }

  const confirmMatch = callbackData.match(/^confirm_(\d+)$/);
  const denyMatch = callbackData.match(/^deny_(\d+)$/);

  if (!confirmMatch && !denyMatch) {
    await ctx.answerCbQuery();
    return;
  }

  const targetUserId = parseInt(confirmMatch ? confirmMatch[1] : denyMatch[1], 10);

  // Only the original sender can confirm/deny their own receipt
  if (from.id !== targetUserId) {
    await ctx.answerCbQuery('Bu tasdiq siz uchun emas.', { show_alert: true });
    return;
  }

  const pending = getPending(from.id, chat.id);
  if (!pending) {
    await ctx.answerCbQuery('Tasdiq muddati o\'tdi yoki topilmadi.', { show_alert: true });
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    return;
  }

  if (confirmMatch) {
    try {
      await appendCheck({
        username: pending.username,
        name: pending.name,
        amount: pending.amount,
        groupId: pending.groupId,
        type: 'chek',
      });

      deletePending(from.id, chat.id);

      const formatted = pending.amount.toLocaleString('uz-UZ');
      await ctx.editMessageText(
        `✅ *${formatted} so'm* Google Sheets ga saqlandi!`,
        { parse_mode: 'Markdown' }
      );
      await ctx.answerCbQuery('Saqlandi!');

      logger.info(`Check confirmed: user ${from.id} | amount ${pending.amount} | group ${chat.id}`);
    } catch (err) {
      logger.error(`appendCheck failed: ${err.message}`, err);
      await ctx.answerCbQuery('Saqlashda xatolik. Qayta urinib ko\'ring.', { show_alert: true });
    }
  } else if (denyMatch) {
    deletePending(from.id, chat.id);
    await ctx.editMessageText(
      '❌ Bekor qilindi. To\'g\'ri summani kiriting:\n`/hisob <summa>`',
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCbQuery('Bekor qilindi.');
    logger.info(`Check denied: user ${from.id} | group ${chat.id}`);
  }
}

module.exports = { handleCallback };
