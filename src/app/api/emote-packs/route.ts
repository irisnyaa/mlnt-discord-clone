import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const emoteSchema = z.object({
  id: z.string().min(1),
  name: z.string().regex(/^[A-Za-z0-9_]{2,32}$/),
  animated: z.boolean(),
  format: z.enum(["webp", "png", "gif", "avif"]),
  sourceUrl: z.string().url().optional().nullable(),
  assetPath: z.string().optional().nullable(),
  discordSyntax: z.string(),
  shortcode: z.string(),
});

const packSchema = z.object({
  schema: z.literal("mlnt-emote-pack/v1"),
  pack: z.object({ id: z.string().min(1), name: z.string().min(1), slug: z.string().min(1), version: z.number() }),
  emotes: z.array(emoteSchema),
});

function validAssetPath(path?: string | null) {
  return !path || (!path.startsWith("/") && !path.includes("..") && !/^https?:\/\//i.test(path));
}

export async function POST(req: NextRequest) {
  await requireUser();
  const parsed = packSchema.parse(await req.json());
  for (const emote of parsed.emotes) {
    if (!emote.sourceUrl && !emote.assetPath) return NextResponse.json({ error: "emote asset missing" }, { status: 400 });
    if (!validAssetPath(emote.assetPath)) return NextResponse.json({ error: "bad asset path" }, { status: 400 });
  }

  const tx = db.transaction(() => {
    db.prepare("INSERT OR REPLACE INTO emote_packs (id, name, slug, json) VALUES (?, ?, ?, ?)")
      .run(parsed.pack.id, parsed.pack.name, parsed.pack.slug, JSON.stringify(parsed));
    db.prepare("DELETE FROM emotes WHERE pack_id = ?").run(parsed.pack.id);
    const insert = db.prepare(`
      INSERT INTO emotes (id, pack_id, name, animated, format, source_url, asset_path, discord_syntax, shortcode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const emote of parsed.emotes) {
      insert.run(
        emote.id,
        parsed.pack.id,
        emote.name,
        emote.animated ? 1 : 0,
        emote.format,
        emote.sourceUrl ?? null,
        emote.assetPath ?? null,
        emote.discordSyntax,
        emote.shortcode,
      );
    }
  });
  tx();
  return NextResponse.json({ ok: true, emotes: parsed.emotes.length });
}
