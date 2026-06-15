# Emote Pack Spec v1

Portable static emote export format for the Discord-like web UI.

## Goals

- Web app must not depend on Discord at runtime for rendering emotes.
- Vencord exporter can dump selected Discord server emotes into this format.
- Supports static and animated custom emotes.
- Supports Discord-compatible syntax and friendly shortcodes.
- Keeps implementation details out of UI copy.

## Bundle layouts

### Single pack

```text
example-server-emotes/
  emote-pack.json
  assets/
    987654321098765432.webp
    222222222222222222.gif
```

### Multi-pack library

```text
emote-packs/
  manifest.json
  packs/
    discord-123456789012345678/
      emote-pack.json
      assets/
        987654321098765432.webp
        222222222222222222.gif
```

## `emote-pack.json`

```json
{
  "schema": "mlnt-emote-pack/v1",
  "generatedAt": "2026-06-15T09:30:00.000Z",
  "source": {
    "kind": "discord",
    "guildId": "123456789012345678",
    "guildName": "Example Server",
    "guildIcon": "https://cdn.discordapp.com/icons/123/icon.webp"
  },
  "pack": {
    "id": "discord-123456789012345678",
    "name": "Example Server",
    "slug": "example-server",
    "version": 1
  },
  "assets": {
    "basePath": "./assets/",
    "naming": "{id}.{ext}"
  },
  "emotes": [
    {
      "id": "987654321098765432",
      "name": "blobcat",
      "aliases": ["blob"],
      "animated": false,
      "format": "webp",
      "mime": "image/webp",
      "width": null,
      "height": null,
      "sizeBytes": null,
      "sourceUrl": "https://cdn.discordapp.com/emojis/987654321098765432.webp?quality=lossless",
      "assetPath": "assets/987654321098765432.webp",
      "discordSyntax": "<:blobcat:987654321098765432>",
      "shortcode": ":blobcat:",
      "roles": [],
      "available": true
    },
    {
      "id": "222222222222222222",
      "name": "dance",
      "aliases": [],
      "animated": true,
      "format": "gif",
      "mime": "image/gif",
      "width": null,
      "height": null,
      "sizeBytes": null,
      "sourceUrl": "https://cdn.discordapp.com/emojis/222222222222222222.gif?quality=lossless",
      "assetPath": "assets/222222222222222222.gif",
      "discordSyntax": "<a:dance:222222222222222222>",
      "shortcode": ":dance:",
      "roles": [],
      "available": true
    }
  ]
}
```

## `manifest.json`

```json
{
  "schema": "mlnt-emote-library/v1",
  "generatedAt": "2026-06-15T09:30:00.000Z",
  "packs": [
    {
      "id": "discord-123456789012345678",
      "name": "Example Server",
      "slug": "example-server",
      "path": "packs/discord-123456789012345678/emote-pack.json",
      "emoteCount": 128,
      "animatedCount": 34,
      "source": {
        "kind": "discord",
        "guildId": "123456789012345678"
      }
    }
  ]
}
```

## Minimal TypeScript types

```ts
export type EmotePackV1 = {
  schema: "mlnt-emote-pack/v1";
  generatedAt: string;
  source: {
    kind: "discord";
    guildId: string;
    guildName: string;
    guildIcon?: string;
  };
  pack: {
    id: string;
    name: string;
    slug: string;
    version: number;
  };
  assets?: {
    basePath: string;
    naming: string;
  };
  emotes: EmoteV1[];
};

export type EmoteV1 = {
  id: string;
  name: string;
  aliases?: string[];
  animated: boolean;
  format: "webp" | "png" | "gif" | "avif";
  mime?: string;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
  sourceUrl?: string;
  assetPath?: string;
  discordSyntax: string;
  shortcode: string;
  roles?: string[];
  available?: boolean;
};
```

## Message syntax

The renderer must support:

```text
<:blobcat:987654321098765432>
<a:dance:222222222222222222>
:blobcat:
:example-server/blobcat:
```

Resolution priority:

1. Exact Discord syntax by ID: `<:name:id>` / `<a:name:id>`.
2. Pack-qualified shortcode: `:pack_slug/name:`.
3. Simple shortcode: `:name:`.
4. If ambiguous, prefer enabled packs for the current user/channel, then first loaded pack.

## Rendering contract

Render an emote as an image, never raw HTML:

```html
<img class="emote" src="..." alt=":blobcat:" title="blobcat" />
```

Recommended CSS:

```css
.emote {
  height: 1.375em;
  width: auto;
  max-width: 3em;
  vertical-align: -0.25em;
  object-fit: contain;
}

.emote.big {
  height: 3rem;
  max-width: 6rem;
}
```

If a message consists only of emotes and whitespace, the UI may render them larger.

## Validation rules

- `schema` must equal `mlnt-emote-pack/v1`.
- each emote must have `id`, `name`, `animated`, and either `assetPath` or `sourceUrl`.
- `name` must match `^[A-Za-z0-9_]{2,32}$`.
- `assetPath` must be relative and must not contain `..`.
- allowed formats: `webp`, `png`, `gif`, `avif`.
- ban SVG for v1.
- do not render emote names, aliases, or pack names as raw HTML.

## Vencord exporter requirements

The exporter should:

- list all guilds the user can access;
- allow selecting one or more guilds;
- show emote count per guild;
- export JSON-only or full zip with assets;
- optionally include/exclude animated emotes;
- optionally include/exclude static emotes;
- cap asset fetch concurrency to avoid hammering Discord CDN;
- write one `emote-pack.json` per guild;
- write a top-level `manifest.json` for multi-guild exports.

Discord CDN URL shape:

```ts
function discordEmojiUrl(id: string, animated: boolean) {
  return `https://cdn.discordapp.com/emojis/${id}.webp${animated ? "?animated=true&quality=lossless" : "?quality=lossless"}`;
}
```

Animated Discord emotes should prefer animated WebP in this exporter. Some newer/custom animated emotes have valid `webp?animated=true` URLs while `.gif` is not available. Browsers render animated WebP, so this avoids false broken emotes.

## Implementation order

1. Web app parser and renderer with a manual test pack.
2. SQLite-backed messages/chats/auth app.
3. Emote upload/import endpoint for full exported packs.
4. Vencord JSON-only exporter.
5. Vencord zip exporter with local assets.
