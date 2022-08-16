import { Bot, Context, webhookCallback } from 'https://deno.land/x/grammy@v1.10.1/mod.ts';
import { Application } from 'https://deno.land/x/oak@v10.6.0/mod.ts';

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_BOT_SECRET = TELEGRAM_BOT_TOKEN.replace(':', '');

// Handlers
const startHandler = async (ctx: Context) => {
  await ctx.reply('Welcome 👋\nHow can I help?');
}

// Setup bot
const bot = new Bot(TELEGRAM_BOT_TOKEN);
bot.command("start", startHandler);

// Setup oak
const app = new Application();
app.use(webhookCallback(bot, 'oak', { secretToken: TELEGRAM_BOT_SECRET }));
app.listen();