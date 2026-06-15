# mlnt-discord-clone

Dark Discord-layout threaded LLM chat app with Discord OAuth, SQLite storage, and portable emote-pack rendering.

## Features

- Discord OAuth sign-in
- SQLite chats/messages
- user-created LLM chat threads
- sidebar showing each thread and creator
- local llama.cpp/OpenAI-compatible backend support
- emote-pack v1 rendering for `:name:`, `:pack/name:`, `<:name:id>`, and `<a:name:id>`

## Env

```bash
DATABASE_PATH=./data/app.db
LLAMA_SERVER_URL=http://10.1.1.150:8080
MODEL_SYSTEM_PROMPT="You are mlntcandy, a casual Discord chatter and software developer. You like making software do things it was not really designed to do."
NEXTAUTH_URL=https://your-domain.example
NEXTAUTH_SECRET=generate-a-long-random-secret
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
```

Discord OAuth redirect URL:

```text
https://your-domain.example/api/auth/callback/discord
```

## Run

```bash
npm install
npm run build
npm start
```

## Emotes

Spec: `docs/emote-pack-spec.md`

Import one JSON emote pack after signing in:

```bash
curl -X POST https://your-domain.example/api/emote-packs \
  -H 'content-type: application/json' \
  -b cookies.txt \
  --data @emote-pack.json
```

The web UI intentionally has no emote autocomplete.
