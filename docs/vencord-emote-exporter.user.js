/*
 * mlnt emote exporter for Vencord / Discord web DevTools console
 *
 * Usage:
 * 1. Open Discord with Vencord enabled.
 * 2. Open DevTools console.
 * 3. Paste this whole file and press Enter.
 * 4. A small picker appears in the page. Select servers, export JSON.
 *
 * JSON-only export: uses Discord CDN sourceUrl values. The website imports it directly.
 */
(async function mlntExportEmotes() {
  const schema = "mlnt-emote-pack/v1";
  const librarySchema = "mlnt-emote-library/v1";

  function slugify(input) {
    return String(input || "server").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "server";
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
    // Discord has animated emotes where .gif 404s but animated .webp works.
    // Modern browsers render animated WebP fine, so export WebP for both static
    // and animated emotes and mark animated URLs explicitly.
    return `https://cdn.discordapp.com/emojis/${id}.webp${animated ? "?animated=true&quality=lossless" : "?quality=lossless"}`;
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
    const raw = EmojiStore.getGuildEmoji?.(guildId) || EmojiStore.getGuildEmojis?.(guildId) || EmojiStore.getEmojiByGuildId?.(guildId) || [];
    if (Array.isArray(raw)) return raw;
    if (raw instanceof Map) return [...raw.values()];
    if (typeof raw === "object") return Object.values(raw);
    return [];
  }

  function showPicker(guilds) {
    return new Promise(resolve => {
      document.getElementById("mlnt-emote-exporter")?.remove();
      const root = document.createElement("div");
      root.id = "mlnt-emote-exporter";
      root.style.cssText = "position:fixed;inset:24px;z-index:999999;background:#111318;color:#f2f3f5;border:1px solid #333744;border-radius:14px;box-shadow:0 20px 80px rgba(0,0,0,.55);font:14px system-ui;display:flex;flex-direction:column;overflow:hidden";
      root.innerHTML = `
        <div style="padding:14px 16px;border-bottom:1px solid #333744;display:flex;gap:12px;align-items:center;justify-content:space-between">
          <div><b>mlnt emote exporter</b><div style="color:#949ba4;font-size:12px">select servers to export</div></div>
          <button data-close style="background:#313338;color:#fff;border:0;border-radius:8px;padding:8px 10px;cursor:pointer">close</button>
        </div>
        <div style="padding:12px 16px;display:flex;gap:8px;align-items:center;border-bottom:1px solid #333744">
          <button data-all style="background:#5865f2;color:white;border:0;border-radius:8px;padding:8px 10px;cursor:pointer">select all</button>
          <button data-none style="background:#313338;color:white;border:0;border-radius:8px;padding:8px 10px;cursor:pointer">select none</button>
          <input data-filter placeholder="filter servers" style="flex:1;background:#1e1f26;color:#fff;border:1px solid #333744;border-radius:8px;padding:8px" />
          <button data-export style="background:#23a55a;color:white;border:0;border-radius:8px;padding:8px 12px;cursor:pointer;font-weight:700">export selected</button>
        </div>
        <div data-list style="overflow:auto;padding:10px 16px;display:grid;gap:6px"></div>
      `;
      document.body.appendChild(root);

      const list = root.querySelector("[data-list]");
      const filter = root.querySelector("[data-filter]");
      const selected = new Set(guilds.filter(g => g.count > 0).map(g => g.id));

      function render() {
        const q = filter.value.toLowerCase();
        list.innerHTML = "";
        for (const guild of guilds) {
          if (q && !guild.name.toLowerCase().includes(q) && !guild.id.includes(q)) continue;
          const label = document.createElement("label");
          label.style.cssText = "display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;background:#1e1f26;border:1px solid #292c36;border-radius:10px;padding:10px;cursor:pointer";
          label.innerHTML = `<input type="checkbox" ${selected.has(guild.id) ? "checked" : ""}/><span></span><code style="color:#949ba4"></code>`;
          label.querySelector("span").textContent = guild.name;
          label.querySelector("code").textContent = `${guild.count} emotes`;
          label.querySelector("input").onchange = e => e.currentTarget.checked ? selected.add(guild.id) : selected.delete(guild.id);
          list.appendChild(label);
        }
      }

      root.querySelector("[data-close]").onclick = () => { root.remove(); resolve([]); };
      root.querySelector("[data-all]").onclick = () => { guilds.forEach(g => selected.add(g.id)); render(); };
      root.querySelector("[data-none]").onclick = () => { selected.clear(); render(); };
      root.querySelector("[data-export]").onclick = () => { const ids = [...selected]; root.remove(); resolve(ids); };
      filter.oninput = render;
      render();
    });
  }

  const { GuildStore, EmojiStore } = getStores();
  const guilds = Object.values(GuildStore.getGuilds()).map(g => ({ id: g.id, name: g.name, icon: g.icon, count: getGuildEmojis(EmojiStore, g.id).length })).sort((a, b) => a.name.localeCompare(b.name));
  const selectedIds = await showPicker(guilds);
  if (!selectedIds.length) return console.log("mlnt export cancelled/no guilds selected");
  const selectedGuilds = guilds.filter(g => selectedIds.includes(g.id));

  const generatedAt = new Date().toISOString();
  const packs = selectedGuilds.map(guild => {
    const slug = slugify(guild.name);
    const packId = `discord-${guild.id}`;
    const emotes = getGuildEmojis(EmojiStore, guild.id).filter(e => e?.id && e?.name).map(e => {
      const animated = Boolean(e.animated);
      const format = "webp";
      return {
        id: String(e.id),
        name: String(e.name),
        aliases: [],
        animated,
        format,
        mime: "image/webp",
        width: null,
        height: null,
        sizeBytes: null,
        sourceUrl: discordEmojiUrl(e.id, animated),
        assetPath: null,
        discordSyntax: `<${animated ? "a" : ""}:${e.name}:${e.id}>`,
        shortcode: `:${e.name}:`,
        roles: Array.isArray(e.roles) ? e.roles.map(String) : [],
        available: e.available !== false,
      };
    });
    return { schema, generatedAt, source: { kind: "discord", guildId: guild.id, guildName: guild.name, guildIcon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=128` : undefined }, pack: { id: packId, name: guild.name, slug, version: 1 }, assets: { basePath: "", naming: "discord-cdn-sourceUrl" }, emotes };
  });

  const manifest = { schema: librarySchema, generatedAt, packs: packs.map(pack => ({ id: pack.pack.id, name: pack.pack.name, slug: pack.pack.slug, path: `packs/${pack.pack.id}/emote-pack.json`, emoteCount: pack.emotes.length, animatedCount: pack.emotes.filter(e => e.animated).length, source: { kind: "discord", guildId: pack.source.guildId } })) };
  const output = { schema: librarySchema, generatedAt, manifest, packs };
  downloadJson("mlnt-emote-packs.json", output);
  console.log(`mlnt exported ${packs.reduce((n, p) => n + p.emotes.length, 0)} emotes from ${packs.length} guild(s).`, output);
})();
