const { Markup } = require('telegraf');
const { extractTextFromImage } = require('../vision');
const { extractAmount } = require('../extractAmount');
const { ensureUser } = require('../sheets');
const { setPending } = require('../state');
const logger = require('../logger');

async function handlePhoto(ctx) {
  const { from, chat, message } = ctx;
  if (!from || !chat) return;

  // Auto-register user
  await ensureUser({
    userId: from.id,
    username: from.username || '',
    name: [from.first_name, from.last_name].filter(Boolean).join(' '),
    groupId: chat.id,
  }).catch((err) => logger.error(`ensureUser failed: ${err.message}`));

  // Get the highest-resolution photo
  const photos = message.photo;
  if (!photos || photos.length === 0) return;
  const largest = photos[photos.length - 1];

  let processingMsg;
  try {
    processingMsg = await ctx.reply('Chek rasmi qabul qilindi, tahlil qilinmoqda...');

    // Get file URL from Telegram
    const fileLink = await ctx.telegram.getFileLink(largest.file_id);
    const imageUrl = fileLink.href;

    // Run OCR
    const ocrText = await extractTextFromImage(imageUrl);
    if (!ocrText) {
      await ctx.reply(
        'Rasmdan matn o\'qib bo\'lmadi. Iltimos, aniqroq rasm yuboring yoki summani qo\'lda kiriting:\n/hisob <summa>'
      );
      return;
    }

    // Extract amount
    const amount = extractAmount(ocrText);

    if (!amount) {
      await ctx.reply(
        'Summani aniqlab bo\'lmadi. Iltimos, qo\'lda kiriting:\n/hisob <summa>'
      );
      return;
    }

    // Store pending confirmation
    setPending(from.id, chat.id, {
      amount,
      username: from.username || '',
      name: [from.first_name, from.last_name].filter(Boolean).join(' '),
      groupId: chat.id,
      fileUrl: imageUrl,
    });

    const formatted = amount.toLocaleString('uz-UZ');
    await ctx.reply(
      `Topildi: *${formatted} so'm*\nTasdiqlaysizmi?`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Ha', `confirm_${from.id}`),
            Markup.button.callback('❌ Yo\'q', `deny_${from.id}`),
          ],
        ]),
      }
    );
  } catch (err) {
    logger.error(`photoHandler error: ${err.message}`, err);
    await ctx.reply(
      'Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring yoki summani qo\'lda kiriting:\n/hisob <summa>'
    );
  } finally {
    if (processingMsg) {
      await ctx.telegram
        .deleteMessage(chat.id, processingMsg.message_id)
        .catch(() => {});
    }
  }
}

module.exports = { handlePhoto };
