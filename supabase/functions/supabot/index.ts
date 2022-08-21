import { Bot, BotError, Context, GrammyError, session, webhookCallback } from 'https://deno.land/x/grammy@v1.10.1/mod.ts';
import { User, Message } from "https://deno.land/x/grammy@v1.10.1/types.deno.ts";
import { Application, isHttpError, Router } from 'https://deno.land/x/oak@v10.6.0/mod.ts';
import { type Conversation, type ConversationFlavor, conversations, createConversation } from "https://deno.land/x/grammy_conversations@v1.0.2/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

type BotContext = Context & ConversationFlavor;
// @ts-ignore mismatched types in grammy
type BotConversation = Conversation<BotContext>;

const BASE_URL = Deno.env.get("BASE_URL")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_TABLE = Deno.env.get("SUPABASE_TABLE") ?? 'sessions';
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_CHAT_RULES = Deno.env.get("TELEGRAM_CHAT_IDS")!.split(';');
const TELEGRAM_CHAT_IDS = TELEGRAM_CHAT_RULES.map(i => i.split(':')[0]);
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

const pickChatId = <T,>(array: T[], id?: number | null) => array[(id || 0) % array.length];

const pickChatIdByKeywords = (chats: string[], chatRules: string[]) =>
  (id?: number, text?: string) => {
    if (!id || !text) return chats[0];
    // Uses (?=.*(auth|docs)) or (?=.*(bug))(?=.*(edge|functions))
    const rules = chatRules
      .map(group => ({
        id: group.split(':')[0],
        filter: group.split(':')[1]?.split('&')
      }))
      .map(group => ({
        id: group.id,
        keywords: group.filter?.map(k => k.split(',')),
        regex: new RegExp(group.filter?.map(k => `(?=.*(${k.replace(',', '|')}))`).join(''), 'i')
      }));

    const withKeywords = rules.filter(rule => rule.keywords?.length > 0);
    const withoutKeywords = rules.filter(rule => !rule.keywords?.length);

    // If no specific chat found, pick one among no-keyword chats if any.
    // Otherwise, among all of them.
    const fallbackList = withoutKeywords.length ? withoutKeywords : rules;
    const matchesKeywords = withKeywords.filter(rule => rule.regex.test(text));
    return matchesKeywords.length ? pickChatId(matchesKeywords, id).id : pickChatId(fallbackList, id).id;
  }

// Handlers
const startHandler = (chats: string[], rules: string[]) =>
  async (ctx: Context) => {
    await ctx.reply(WELCOME_MESSAGE);
    await ctx.api.sendMessage(pickChatIdByKeywords(chats, rules)(), `👋 ${userToString(ctx.from)}`);
  }

const faqHandler = async (ctx: Context) => {
  await ctx.reply(FAQ_MESSAGE);
}

const infoHandler = async (ctx: Context) => {
  await ctx.reply(`This chat id is ${ctx.chat?.id}.`);
}

const RULES_REGEX = /^([-]?[\d]+(:[\w&,]+)?[;]?)+$/;
const TOKEN_REGEX = /^\d+:[\w-]+$/;
const onboard = async (conversation: BotConversation, ctx: BotContext) => {
  const example = '👉 Example: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
  const message = `🔒 Please, send bot token or /cancel.\n\n💬 You can get one from @BotFather/newbot command.\n\n${example}`;
  let token: string | undefined = '';
  const user_id = ctx?.from?.id.toString();
  if (!user_id) return;

  while (!token) {
    await ctx.reply(message);
    ctx = await conversation.wait();
    token = TOKEN_REGEX.exec(ctx?.msg?.text ?? '')?.[0];
  }

  // TODO: Consider asking for chats here separately.
  let rules: string | undefined = '';
  while (!rules) {
    await ctx.reply(`Please, send rules or a chat id to forward messages to.\n\n💬 To get chat id add this bot to a group and type /info.\n\n👉 Example (this chat): ${user_id}.`);
    ctx = await conversation.wait();
    rules = RULES_REGEX.exec(ctx?.msg?.text ?? '')?.[0];
  }

  await conversation.external(async () => {
    const url = `https://api.telegram.org/bot${token}/setWebhook?url=${BASE_URL}/message/${token}?secret=${TELEGRAM_BOT_TOKEN}&drop_pending_updates=true`
    const response = await fetch(url);
    if (!response.ok) {
      await ctx.reply('Looks like token is invalid. Please, try again.');
      await ctx.conversation.exit();
      return;
    }

    await supabase.from(SUPABASE_TABLE).upsert({ token, id: user_id, rules: rules });
  })

  await ctx.reply('✓');
}

// Picks chat id to forward from list based on user id
const forwardToChat = (chats: string[], rules: string[]) =>
  async (ctx: Context) => {
    const chatId = pickChatIdByKeywords(chats, rules)(ctx.from?.id, ctx.msg?.text);
    const forwarded = await ctx.forwardMessage(chatId);
    if (!forwarded.forward_from) {
      await ctx.api.sendMessage(chatId, `${ctx.from?.id}\n${REPLY_MESSAGE}`);
    }
  }

const forwardToUser = (chats: string[], rules: string[]) =>
  async (ctx: Context) => {
    const userId = retrieveUserId(ctx.msg);
    return userId
      ? await ctx.api.copyMessage(userId, ctx.msg!.chat.id, ctx.msg!.message_id)
      : await ctx.api.sendMessage(pickChatIdByKeywords(chats, rules)(), WRONG_REPLY_MESSAGE);
  }

const errorHandler = async (context: any, next: any) => {
  try {
    await next();
  } catch (err) {
    console.log(err)
    if (err instanceof GrammyError || err instanceof BotError) {
      // TODO: Consider moving to handlers, and pause bot subscription.
      context.response.status = 200;
    } else if (isHttpError(err)) {
      context.response.status = err.status;
    } else {
      context.response.status = 500;
    }
    context.response.body = { error: err.message };
    context.response.type = "json";
  }
}

// Setup bot
const createBot = (token: string, chats: string[], rules: string[], isFather = false) => {
  const bot = new Bot<BotContext>(token);
  bot.command("info", infoHandler);
  bot.command("faq", faqHandler);

  if (isFather) {
    bot.use(session({ initial: () => ({}) }));
    // @ts-ignore mismatched types in grammy
    bot.use(conversations());

    bot.command("cancel", async (ctx) => {
      await ctx.reply('✓');
      await ctx.conversation.exit();
    });

    // @ts-ignore mismatched types in grammy
    bot.use(createConversation(onboard));
    bot.command("new", (ctx) => ctx.conversation.enter("onboard"));
  }

  bot.command("start", startHandler(chats, rules));

  bot.filter(ctx => ctx.chat?.type === 'private' && !chats.includes(ctx.chat?.id?.toString()))
    .on("message", forwardToChat(chats, rules));
  bot.filter(ctx => chats.includes(ctx.chat?.id?.toString() ?? '') && !!ctx.msg?.reply_to_message)
    .on("message", forwardToUser(chats, rules));

  return bot;
}

const bot = createBot(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_IDS, TELEGRAM_CHAT_RULES, true);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Setup oak
const app = new Application();

const retrieveBot = async (token?: string) => {
  if (!token) return null;

  const { data } = await supabase
    .from(SUPABASE_TABLE)
    .select('rules')
    .match({ token })
    .single();
  const rules = data?.rules?.split(';');
  const chats = rules?.map((rule: any) => rule?.split(":")?.[0]);

  if (!rules || !chats) return null;

  return createBot(token, chats, rules);
}

const router = new Router();

router.post("/father", webhookCallback(bot, 'oak'));
router.post("/message/:token", async (context) => {
  const bot = await retrieveBot(context?.params?.token);
  if (!bot) {
    context.response.status = 404;
    return;
  }
  await webhookCallback(bot, 'oak')(context);
});

app.use(errorHandler);
app.use(router.routes());
app.use(router.allowedMethods());

app.listen();