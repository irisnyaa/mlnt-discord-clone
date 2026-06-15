export type ClientEmote = {
  id: string;
  packSlug: string;
  name: string;
  sourceUrl: string | null;
  assetPath: string | null;
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

export function renderMessageHtmlClient(content: string, emotes: ClientEmote[] = []) {
  const byId = new Map(emotes.map(e => [e.id, e]));
  const byName = new Map<string, ClientEmote[]>();
  for (const e of emotes) byName.set(e.name, [...(byName.get(e.name) ?? []), e]);
  const byQualified = new Map(emotes.map(e => [`${e.packSlug}/${e.name}`, e]));
  const token = /(<a?:[A-Za-z0-9_]{2,32}:\d{5,}>|:[A-Za-z0-9_-]+\/[A-Za-z0-9_]{2,32}:|:[A-Za-z0-9_]{2,32}:)/g;
  let out = "";
  let last = 0;

  for (const match of content.matchAll(token)) {
    const raw = match[0];
    const index = match.index ?? 0;
    out += escapeHtml(content.slice(last, index));
    last = index + raw.length;

    const discord = raw.match(/^<a?:([A-Za-z0-9_]{2,32}):(\d{5,})>$/);
    let emote = discord ? byId.get(discord[2]) : undefined;
    if (!emote) {
      const q = raw.match(/^:([A-Za-z0-9_-]+\/[A-Za-z0-9_]{2,32}):$/);
      if (q) emote = byQualified.get(q[1]);
    }
    if (!emote) {
      const simple = raw.match(/^:([A-Za-z0-9_]{2,32}):$/);
      if (simple) emote = byName.get(simple[1])?.[0];
    }

    const src = emote?.assetPath || emote?.sourceUrl || "";
    if (!emote || !src) {
      out += escapeHtml(raw);
      continue;
    }
    out += `<img class="emote" src="${escapeHtml(src)}" alt=":${escapeHtml(emote.name)}:" title="${escapeHtml(emote.name)}" />`;
  }

  out += escapeHtml(content.slice(last));
  return out.replace(/\n/g, "<br />");
}
