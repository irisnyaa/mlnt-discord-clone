"use client";

import { useState } from "react";

type EmotePack = {
  schema: "mlnt-emote-pack/v1";
  pack: { name: string };
  emotes: unknown[];
};

type ExportFile = EmotePack | { packs?: EmotePack[] };

function extractPacks(value: ExportFile): EmotePack[] {
  if (value && "schema" in value && value.schema === "mlnt-emote-pack/v1") return [value];
  if (value && "packs" in value && Array.isArray(value.packs)) return value.packs.filter(pack => pack?.schema === "mlnt-emote-pack/v1");
  return [];
}

export function EmoteImportClient() {
  const [status, setStatus] = useState("pick mlnt-emote-packs.json or a single emote-pack.json");
  const [busy, setBusy] = useState(false);

  async function importFile(file: File) {
    setBusy(true);
    try {
      const parsed = JSON.parse(await file.text()) as ExportFile;
      const packs = extractPacks(parsed);
      if (!packs.length) throw new Error("no emote packs found in file");

      let total = 0;
      for (const pack of packs) {
        setStatus(`importing ${pack.pack.name}...`);
        const res = await fetch("/api/emote-packs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(pack),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `import failed: ${res.status}`);
        total += Number(data.emotes ?? pack.emotes.length ?? 0);
      }
      setStatus(`imported ${packs.length} pack(s), ${total} emote(s). try :emote_name: in chat now.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="emote-import-card">
      <h1>import emotes</h1>
      <p>Upload the JSON from the Vencord exporter. This imports Discord CDN-backed emotes into the site database.</p>
      <input
        type="file"
        accept="application/json,.json"
        disabled={busy}
        onChange={event => {
          const file = event.currentTarget.files?.[0];
          if (file) void importFile(file);
        }}
      />
      <pre>{status}</pre>
      <p className="hint">Supported syntax after import: <code>:name:</code>, <code>:pack/name:</code>, and Discord custom emote syntax.</p>
    </div>
  );
}
