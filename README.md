# Supabot

#### 1. Create bot
Talk to [BotFather](https://t.me/botfather) to create a bot and get a token.

#### 2. Create support chat
Create a group chat and copy its id. You can find id in url by opening group chat in [web](https://web.telegram.org/) version.

#### 3. Deploy
[![Deploy to Deno](https://deno.com/deno-deploy-button.svg)](https://dash.deno.com/new?url=https://raw.githubusercontent.com/tchief/supabot/main/mod.ts&env=TELEGRAM_BOT_TOKEN,TELEGRAM_CHAT_ID)

#### 4. Set webhook
Replace `{YOUR_...}` with your variables and go to

`https://api.telegram.org/bot{YOUR_TOKEN}/setWebhook?url=https://{YOUR_DENO_PROJECT_NAME}.deno.dev&secret_token={YOUR_TOKEN_WITHOUT_:}`

#### 5. Enjoy
