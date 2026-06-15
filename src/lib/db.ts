import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const configuredDbPath = process.env.DATABASE_PATH;
const dbPath = configuredDbPath ? resolve(configuredDbPath) : resolve(process.cwd(), "data", "app.db");
mkdirSync(dirname(dbPath), { recursive: true });

const globalForDb = globalThis as unknown as { db?: Database.Database };
export const db = globalForDb.db ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  image TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  author_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS emote_packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS emotes (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  name TEXT NOT NULL,
  animated INTEGER NOT NULL,
  format TEXT NOT NULL,
  source_url TEXT,
  asset_path TEXT,
  discord_syntax TEXT NOT NULL,
  shortcode TEXT NOT NULL,
  FOREIGN KEY (pack_id) REFERENCES emote_packs(id) ON DELETE CASCADE
);
`);

export type ChatRow = {
  id: string;
  title: string;
  creatorId: string;
  creatorName: string | null;
  creatorImage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MessageRow = {
  id: string;
  chatId: string;
  authorId: string | null;
  authorName: string | null;
  authorImage: string | null;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export function upsertUser(user: { id: string; name?: string | null; image?: string | null }) {
  db.prepare(`
    INSERT INTO users (id, name, image) VALUES (@id, @name, @image)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, image = excluded.image
  `).run({ id: user.id, name: user.name ?? null, image: user.image ?? null });
}

export function listChats(): ChatRow[] {
  return db.prepare(`
    SELECT c.id, c.title, c.creator_id creatorId, u.name creatorName, u.image creatorImage,
           c.created_at createdAt, c.updated_at updatedAt
    FROM chats c JOIN users u ON u.id = c.creator_id
    ORDER BY c.updated_at DESC
  `).all() as ChatRow[];
}

export function createChat(input: { id: string; title: string; creatorId: string }) {
  db.prepare("INSERT INTO chats (id, title, creator_id) VALUES (?, ?, ?)").run(input.id, input.title, input.creatorId);
}

export function updateChatTitle(id: string, title: string) {
  db.prepare("UPDATE chats SET title = ?, updated_at = datetime('now') WHERE id = ?").run(title, id);
}

export function deleteChat(id: string) {
  db.prepare("DELETE FROM chats WHERE id = ?").run(id);
}

export function getChat(id: string): ChatRow | undefined {
  return db.prepare(`
    SELECT c.id, c.title, c.creator_id creatorId, u.name creatorName, u.image creatorImage,
           c.created_at createdAt, c.updated_at updatedAt
    FROM chats c JOIN users u ON u.id = c.creator_id
    WHERE c.id = ?
  `).get(id) as ChatRow | undefined;
}

export function listMessages(chatId: string): MessageRow[] {
  return db.prepare(`
    SELECT m.id, m.chat_id chatId, m.author_id authorId, u.name authorName, u.image authorImage,
           m.role, m.content, m.created_at createdAt
    FROM messages m LEFT JOIN users u ON u.id = m.author_id
    WHERE m.chat_id = ?
    ORDER BY m.created_at ASC
  `).all(chatId) as MessageRow[];
}

export function addMessage(input: { id: string; chatId: string; authorId?: string | null; role: "user" | "assistant"; content: string }) {
  const tx = db.transaction(() => {
    db.prepare("INSERT INTO messages (id, chat_id, author_id, role, content) VALUES (?, ?, ?, ?, ?)")
      .run(input.id, input.chatId, input.authorId ?? null, input.role, input.content);
    db.prepare("UPDATE chats SET updated_at = datetime('now') WHERE id = ?").run(input.chatId);
  });
  tx();
}

export type EmoteRow = {
  id: string;
  packId: string;
  packSlug: string;
  name: string;
  animated: boolean;
  format: string;
  sourceUrl: string | null;
  assetPath: string | null;
  discordSyntax: string;
  shortcode: string;
};

export function listEmotes(): EmoteRow[] {
  return (db.prepare(`
    SELECT e.id, e.pack_id packId, p.slug packSlug, e.name, e.animated, e.format,
           e.source_url sourceUrl, e.asset_path assetPath, e.discord_syntax discordSyntax, e.shortcode
    FROM emotes e JOIN emote_packs p ON p.id = e.pack_id
    ORDER BY p.name, e.name
  `).all() as Array<Omit<EmoteRow, "animated"> & { animated: number }>).map(e => ({ ...e, animated: Boolean(e.animated) }));
}
