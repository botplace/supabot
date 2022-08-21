<p align="center">
<img width="150" src="https://user-images.githubusercontent.com/729374/185797791-ea770c47-13c7-4060-a2b4-9c7fc8c7257c.png" />
<h1 align="center"><b>Supabot</b></h1>
<p align="center">
  Bot builder for Supabase users.
    <br />
    <a href="https://t.me/SupabaseBot"><strong>⚡ Build your bot ⚡</strong></a>
  </p>
</p>

## How it works

Setup support, feedback or anonymous chats. Works similar to Livegram & its clones, but with [forwarding rules](#chat-forwarding-rules). Bot does not store user history.
1. User writes to the bot.
2. Bot forwards message to the chat predefined by rules.
3. Admin replies to the message.
4. Bot forwards message to user.

## Roadmap

- [x] Forward private messages to support chat
- [X] Support multiple chats to forward
- [x] Rules for routing messages
- [x] Self host single telegram support bot
- [x] Create telegram support bot via <a href="https://t.me/SupabaseBot">Supabot</a>
- [ ] Message customization
- [ ] Tickets / threads
- [ ] More bot types
- [ ] More platforms

## Hosted

Talk to <a href="https://t.me/SupabaseBot">Supabot</a>.

## Self Hosting

You can host a single support telegram bot on Deno or Supabase Functions.
Bot builder data stored in Supabase, to self host it, run migrations first.

#### 1. Create bot
Talk to [BotFather](https://t.me/botfather) to create a bot and get a token.

#### 2. Create support chat
Create a group chat and copy its id. You can find id in url by opening group chat in [web](https://web.telegram.org/) version.

#### 3. Deploy
[![Deploy to Deno](https://deno.com/deno-deploy-button.svg)](https://dash.deno.com/new?url=https://raw.githubusercontent.com/tchief/supabot/v0.1.0/mod.ts&env=TELEGRAM_BOT_TOKEN,TELEGRAM_CHAT_IDS)

#### 4. Environment variables
1. `TELEGRAM_BOT_TOKEN`: [bot token](#1-create-bot)
2. `TELEGRAM_CHAT_IDS`: [chat forwarding rules](#chat-forwarding-rules) or list `1231231;-23423423`

##### Optional
3. `WELCOME_MESSAGE`: used when user send `/start` to bot
4. `REPLY_MESSAGE`: used in admin chats
5. `WRONG_REPLY_MESSAGE`: used in admin chats
6. `FAQ_MESSAGE`: used when user send `/faq` to bot

#### 4. Set webhook
Replace `{YOUR_...}` with your variables and go to

`https://api.telegram.org/bot{YOUR_TOKEN}/setWebhook?url=https://{YOUR_DENO_PROJECT_NAME}.deno.dev&secret_token={YOUR_TOKEN_WITHOUT_:}`

#### 5. Enjoy

### Chat forwarding rules
Could be
 - `-1234567` - single chat id
 - `1231231;-23423423` - list separated by `;`, bots picks any id from list and forwards message there based on user id
 - `1231231:realtime,multiplayer;23423423:auth,docs;5676767:bug&edge,functions` - list with keywords, separated by `,`

 ```
 realtime bug -> 1231231
 multiplayer is awesome! -> 1231231
 bug in the edge -> 5676767
 functions have bug -> 5676767
 bug somewhere -> random
 ```
