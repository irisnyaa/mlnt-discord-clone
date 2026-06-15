/*
 * mlnt emote exporter for Vencord / Discord web DevTools console
 *
 * Usage:
 * 1. Open Discord with Vencord enabled.
 * 2. Open DevTools console.
 * 3. Paste this whole file and press Enter.
 * 4. Pick servers in the prompt. It downloads mlnt-emote-packs.json.
 *
 * This exports JSON-only packs using Discord CDN sourceUrl values. The web app can
 * import these directly; it does not need a zip unless you want fully self-hosted assets later.
 */
(async function mlntExportEmotes() {
  const schema = "mlnt-emote-pack/v1";
  const librarySchema = "mlnt-emote-library/v1";

  function slugify(input) {
    return String(input || "server")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "server";
  }

  function downloadJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function discordEmojiUrl(id, animated) {
    const ext = animated ? "gif" : "webp";
    return `https://cdn.discordapp.com/emojis/${id}.${ext}?quality=lossless`;
  }

  function getWebpack() {
    const w = window;
    const vc = w.Vencord?.Webpack;
    if (vc?.findByProps) return vc;
    throw new Error("Vencord Webpack API not found. Open Discord with Vencord enabled, then paste this in DevTools console.");
  }

  function getStores() {
    const Webpack = getWebpack();
    const GuildStore = Webpack.Common?.GuildStore || Webpack.findByProps("getGuilds", "getGuild");
    const EmojiStore = Webpack.findByProps("getGuildEmoji") || Webpack.findByProps("getGuildEmojis") || Webpack.findByProps("getUsableCustomEmojiById");
    if (!GuildStore?.getGuilds) throw new Error("Could not find Discord GuildStore.");
    if (!EmojiStore) throw new Error("Could not find Discord EmojiStore.");
    return { GuildStore, EmojiStore };
  }

  function getGuildEmojis(EmojiStore, guildId) {
    const raw =
      EmojiStore.getGuildEmoji?.(guildId) ||
      EmojiStore.getGuildEmojis?.(guildId) ||
      EmojiStore.getEmojiByGuildId?.(guildId) ||
      [];
    if (Array.isArray(raw)) return raw;
    if (raw instanceof Map) return [...raw.values()];
    if (typeof raw === "object") return Object.values(raw);
    return [];
  }

  const { GuildStore, EmojiStore } = getStores();
  const guilds = Object.values(GuildStore.getGuilds())
    .map(g => ({ id: g.id, name: g.name, icon: g.icon }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const rows = guilds.map((g, i) => {
    const count = getGuildEmojis(EmojiStore, g.id).length;
    return `${String(i + 1).padStart(3, " ")}. ${g.name} (${count}) [${g.id}]`;
  });

  const answer = prompt(
    `Pick servers to export. Use numbers, IDs, ranges, or "all".\n\nExamples: 1,4,9-12 or all\n\n${rows.join("\n")}`,
    "all"
  );
  if (!answer) return console.log("mlnt export cancelled");

  const selectedIndexes = new Set();
  const selectedIds = new Set();
  const trimmed = answer.trim().toLowerCase();
  if (trimmed === "all") {
    guilds.forEach((_, i) => selectedIndexes.add(i));
  } else {
    for (const part of answer.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)) {
      if (/^\d+-\d+$/.test(part)) {
        const [a, b] = part.split("-").map(Number);
        for (let n = Math.min(a, b); n <= Math.max(a, b); n++) selectedIndexes.add(n - 1);
      } else if (/^\d{5,}$/.test(part)) {
        if (part.length > 6) selectedIds.add(part);
        else selectedIndexes.add(Number(part) - 1);
      }
    }
  }

  const selectedGuilds = guilds.filter((g, i) => selectedIndexes.has(i) || selectedIds.has(g.id));
  if (!selectedGuilds.length) throw new Error("No valid guilds selected.");

  const generatedAt = new Date().toISOString();
  const packs = selectedGuilds.map(guild => {
    const slug = slugify(guild.name);
    const packId = `discord-${guild.id}`;
    const emotes = getGuildEmojis(EmojiStore, guild.id)
      .filter(e => e?.id && e?.name)
      .map(e => {
        const animated = Boolean(e.animated);
        const format = animated ? "gif" : "webp";
        const sourceUrl = discordEmojiUrl(e.id, animated);
        return {
          id: String(e.id),
          name: String(e.name),
          aliases: [],
          animated,
          format,
          mime: animated ? "image/gif" : "image/webp",
          width: null,
          height: null,
          sizeBytes: null,
          sourceUrl,
          assetPath: null,
          discordSyntax: `<${animated ? "a" : ""}:${e.name}:${e.id}>`,
          shortcode: `:${e.name}:`,
          roles: Array.isArray(e.roles) ? e.roles.map(String) : [],
          available: e.available !== false,
        };
      });

    return {
      schema,
      generatedAt,
      source: {
        kind: "discord",
        guildId: guild.id,
        guildName: guild.name,
        guildIcon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=128` : undefined,
      },
      pack: { id: packId, name: guild.name, slug, version: 1 },
      assets: { basePath: "", naming: "discord-cdn-sourceUrl" },
      emotes,
    };
  });

  const manifest = {
    schema: librarySchema,
    generatedAt,
    packs: packs.map(pack => ({
      id: pack.pack.id,
      name: pack.pack.name,
      slug: pack.pack.slug,
      path: `packs/${pack.pack.id}/emote-pack.json`,
      emoteCount: pack.emotes.length,
      animatedCount: pack.emotes.filter(e => e.animated).length,
      source: { kind: "discord", guildId: pack.source.guildId },
    })),
  };

  const output = { schema: librarySchema, generatedAt, manifest, packs };
  downloadJson("mlnt-emote-packs.json", output);
  console.log(`mlnt exported ${packs.reduce((n, p) => n + p.emotes.length, 0)} emotes from ${packs.length} guild(s).`, output);
})();
