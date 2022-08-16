import { Bot, Context, webhookCallback } from 'https://deno.land/x/grammy@v1.10.1/mod.ts';
import { User, Message } from "https://deno.land/x/grammy@v1.10.1/types.deno.ts";
import { Application } from 'https://deno.land/x/oak@v10.6.0/mod.ts';

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_CHAT_IDS = Deno.env.get("TELEGRAM_CHAT_IDS")!.split(';');
const TELEGRAM_BOT_SECRET = TELEGRAM_BOT_TOKEN.replace(':', '');
const WELCOME_MESSAGE = Deno.env.get("WELCOME_MESSAGE") ?? 'Welcome 👋\nHow can I help?';
const FAQ_MESSAGE = Deno.env.get("FAQ_MESSAGE") ?? 'Please, just ask your question right away.';
const REPLY_MESSAGE = Deno.env.get("REPLY_MESSAGE") ?? 'Reply to this message, please.';
const WRONG_REPLY_MESSAGE = Deno.env.get("WRONG_REPLY_MESSAGE") ?? 'Reply to the proper message, please.';

// Utils
const userToString = (user?: User) =>
  !user ? '👻' : user.username ? `@${user.username}` : `${user.first_name} (${user.id})`;

const retrieveUserId = (msg?: Message) => {
  const forwardFrom = msg?.reply_to_message?.forward_from;
  const replyToText = msg?.reply_to_message?.text;
  return forwardFrom
    ? forwardFrom.id
    : replyToText?.includes(REPLY_MESSAGE) ? +replyToText?.split('\n')?.[0] : null;
}


const pickChatId = (id?: number | null) =>
  TELEGRAM_CHAT_IDS[(id || 0) % TELEGRAM_CHAT_IDS.length];

// Handlers
const startHandler = async (ctx: Context) => {
  await ctx.reply(WELCOME_MESSAGE);
  await ctx.api.sendMessage(pickChatId(ctx.from?.id), `👋 ${userToString(ctx.from)}`);
}

const faqHandler = async (ctx: Context) => {
  await ctx.reply(FAQ_MESSAGE);
}

// Picks chat id to forward from list based on user id
const forwardToChat = async (ctx: Context) => {
  const forwarded = await ctx.forwardMessage(pickChatId(ctx.from?.id));
  if (!forwarded.forward_from) {
    await ctx.api.sendMessage(pickChatId(ctx.from?.id), `${ctx.from?.id}\n${REPLY_MESSAGE}`);
  }
}

const forwardToUser = async (ctx: Context) => {
  const userId = retrieveUserId(ctx.msg);
  return userId
    ? await ctx.api.copyMessage(userId, ctx.msg!.chat.id, ctx.msg!.message_id)
    : await ctx.api.sendMessage(pickChatId(userId), WRONG_REPLY_MESSAGE);
}

// Setup bot
const bot = new Bot(TELEGRAM_BOT_TOKEN);
bot.command("start", startHandler);
bot.command("faq", faqHandler);
bot.filter(ctx => ctx.chat?.type === 'private' && !TELEGRAM_CHAT_IDS.includes(ctx.chat?.id?.toString()))
  .on("message", forwardToChat);
bot.filter(ctx => TELEGRAM_CHAT_IDS.includes(ctx.chat?.id?.toString() ?? '') && !!ctx.msg?.reply_to_message)
  .on("message", forwardToUser);

// Setup oak
const app = new Application();
app.use(webhookCallback(bot, 'oak', { secretToken: TELEGRAM_BOT_SECRET }));
app.listen();