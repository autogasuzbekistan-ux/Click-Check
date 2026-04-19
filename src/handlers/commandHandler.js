const { appendCheck, getTotalSum, getTodaySum, getUserRole, setUserRole, ensureUser } = require('../sheets');
const { isAdmin, isOperatorOrAbove } = require('../roles');
const logger = require('../logger');

/**
 * /start — greeting
 */
async function handleStart(ctx) {
  await ctx.reply(
    'Salom! Men chek nazorat botiman.\n\n' +
    'Chek rasmini yuboring — summani avtomatik aniqlayman.\n\n' +
    'Buyruqlar:\n' +
    '/hisob <summa> — summani qo\'lda kiritish\n' +
    '/hisobot — umumiy summa\n' +
    '/kunlik — bugungi summa'
  );
}

/**
 * /hisob <summa> — manual amount entry
 */
async function handleHisob(ctx) {
  const { from, chat } = ctx;
  if (!from || !chat) return;

  const args = ctx.message.text.split(/\s+/).slice(1);
  const rawAmount = args[0];

  if (!rawAmount) {
    await ctx.reply('Foydalanish: /hisob <summa>\nMisol: /hisob 125000');
    return;
  }

  const amount = parseInt(rawAmount.replace(/[,.\s]/g, ''), 10);
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('Noto\'g\'ri summa. Raqam kiriting.\nMisol: /hisob 125000');
    return;
  }

  // Auto-register user
  await ensureUser({
    userId: from.id,
    username: from.username || '',
    name: [from.first_name, from.last_name].filter(Boolean).join(' '),
    groupId: chat.id,
  }).catch((err) => logger.error(`ensureUser failed: ${err.message}`));

  try {
    await appendCheck({
      username: from.username || '',
      name: [from.first_name, from.last_name].filter(Boolean).join(' '),
      amount,
      groupId: chat.id,
      type: 'qo\'l',
    });

    const formatted = amount.toLocaleString('uz-UZ');
    await ctx.reply(`✅ *${formatted} so'm* saqlandi.`, { parse_mode: 'Markdown' });
    logger.info(`Manual check: user ${from.id} | amount ${amount} | group ${chat.id}`);
  } catch (err) {
    logger.error(`handleHisob error: ${err.message}`, err);
    await ctx.reply('Saqlashda xatolik yuz berdi. Qayta urinib ko\'ring.');
  }
}

/**
 * /hisobot — total sum of all checks
 */
async function handleHisobot(ctx) {
  const { from, chat } = ctx;
  if (!from || !chat) return;

  const role = await getUserRole(from.id, chat.id).catch(() => 'user');
  if (!isOperatorOrAbove(role)) {
    await ctx.reply('Bu buyruq faqat operator va adminlar uchun.');
    return;
  }

  try {
    const total = await getTotalSum();
    const formatted = total.toLocaleString('uz-UZ');
    await ctx.reply(`📊 Jami summa: *${formatted} so'm*`, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error(`handleHisobot error: ${err.message}`, err);
    await ctx.reply('Ma\'lumot olishda xatolik yuz berdi.');
  }
}

/**
 * /kunlik — today's total
 */
async function handleKunlik(ctx) {
  const { from, chat } = ctx;
  if (!from || !chat) return;

  const role = await getUserRole(from.id, chat.id).catch(() => 'user');
  if (!isOperatorOrAbove(role)) {
    await ctx.reply('Bu buyruq faqat operator va adminlar uchun.');
    return;
  }

  try {
    const total = await getTodaySum();
    const formatted = total.toLocaleString('uz-UZ');
    await ctx.reply(`📅 Bugungi summa: *${formatted} so'm*`, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error(`handleKunlik error: ${err.message}`, err);
    await ctx.reply('Ma\'lumot olishda xatolik yuz berdi.');
  }
}

/**
 * /rol @username <user|operator|admin> — change user role (admin only)
 */
async function handleRol(ctx) {
  const { from, chat } = ctx;
  if (!from || !chat) return;

  const callerRole = await getUserRole(from.id, chat.id).catch(() => 'user');
  if (!isAdmin(callerRole)) {
    await ctx.reply('Bu buyruq faqat adminlar uchun.');
    return;
  }

  const parts = ctx.message.text.split(/\s+/).slice(1);
  if (parts.length < 2) {
    await ctx.reply('Foydalanish: /rol @username <user|operator|admin>');
    return;
  }

  const targetUsername = parts[0].replace(/^@/, '');
  const newRole = parts[1].toLowerCase();

  if (!['user', 'operator', 'admin'].includes(newRole)) {
    await ctx.reply('Noto\'g\'ri rol. Faqat: user, operator, admin');
    return;
  }

  // Find user by username in the reply or from members
  const replyTo = ctx.message.reply_to_message;
  let targetUserId = null;

  if (replyTo && replyTo.from) {
    const replyUser = replyTo.from;
    if (!replyUser.username || replyUser.username.toLowerCase() === targetUsername.toLowerCase()) {
      targetUserId = replyUser.id;
    }
  }

  if (!targetUserId) {
    await ctx.reply(
      'Foydalanuvchini topish uchun ularning xabariga reply qiling:\n/rol @username <rol>'
    );
    return;
  }

  const updated = await setUserRole(targetUserId, chat.id, newRole).catch((err) => {
    logger.error(`setUserRole error: ${err.message}`);
    return false;
  });

  if (updated) {
    await ctx.reply(`✅ @${targetUsername} roli "${newRole}" ga o'zgartirildi.`);
  } else {
    await ctx.reply('Foydalanuvchi topilmadi. Avval bot bilan xabar yozgan bo\'lishi kerak.');
  }
}

module.exports = { handleStart, handleHisob, handleHisobot, handleKunlik, handleRol };
