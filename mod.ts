import { Bot, Context, webhookCallback } from 'https://deno.land/x/grammy@v1.10.1/mod.ts';
import { Application } from 'https://deno.land/x/oak@v10.6.0/mod.ts';

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")!;
const TELEGRAM_BOT_SECRET = TELEGRAM_BOT_TOKEN.replace(':', '');
const REPLY_MESSAGE = Deno.env.get("REPLY_MESSAGE") ?? 'Reply to this message, please.';

// Handlers
const startHandler = async (ctx: Context) => {
  await ctx.reply('Welcome 👋\nHow can I help?');
  await ctx.api.sendMessage(TELEGRAM_CHAT_ID, `👋 ${JSON.stringify(ctx.from)}`);
}

const forwardToChat = async (ctx: Context) => {
  const forwarded = await ctx.forwardMessage(TELEGRAM_CHAT_ID);
  if (!forwarded.forward_from) {
    await ctx.api.sendMessage(TELEGRAM_CHAT_ID, `${ctx.from?.id}\n${REPLY_MESSAGE}`);
  }
}

// Setup bot
const bot = new Bot(TELEGRAM_BOT_TOKEN);
bot.command("start", startHandler);
bot.filter(ctx => ctx.chat?.type === 'private').on("message", forwardToChat);

// Setup oak
const app = new Application();
app.use(webhookCallback(bot, 'oak', { secretToken: TELEGRAM_BOT_SECRET }));
app.listen();