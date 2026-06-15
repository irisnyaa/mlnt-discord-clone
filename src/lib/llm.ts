import { MessageRow } from "@/lib/db";

const LLAMA_URL = process.env.LLAMA_SERVER_URL ?? "http://10.1.1.150:8080";
const SYSTEM = process.env.MODEL_SYSTEM_PROMPT ?? "You are mlntcandy, a casual Discord chatter and software developer. You like making software do things it was not really designed to do.";

function contextFromMessages(messages: MessageRow[], userText: string) {
  const window = messages.slice(-16).map(m => {
    const name = m.role === "assistant" ? "mlntcan🤖d" : (m.authorName || "other_1");
    return `${name}: ${m.content}`;
  });
  window.push(`other_1: ${userText}`);
  return window.join("\n");
}

function stripThinking(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function payload(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>, maxTokens: number, stream: boolean) {
  return {
    model: "local",
    messages,
    temperature: 0.8,
    top_k: 64,
    repeat_penalty: 1.1,
    presence_penalty: 0.0,
    top_p: 0.95,
    min_p: 0.0,
    chat_template_kwargs: { enable_thinking: false },
    max_tokens: maxTokens,
    stream,
  };
}

async function postCompletion(body: unknown) {
  const res = await fetch(`${LLAMA_URL.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`model request failed: ${res.status}`);
  return res;
}

async function chatCompletion(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>, maxTokens: number) {
  const res = await postCompletion(payload(messages, maxTokens, false));
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  return stripThinking(content) || "...";
}

export async function generateReply(messages: MessageRow[], userText: string) {
  return chatCompletion([
    { role: "system", content: SYSTEM },
    { role: "user", content: contextFromMessages(messages, userText) },
  ], 220);
}

export async function generateTitle(firstMessage: string, firstReply: string) {
  const title = await chatCompletion([
    { role: "system", content: "Generate a short chat title. Return only the title, no quotes, no punctuation unless needed. 2-5 words." },
    { role: "user", content: `User: ${firstMessage}\nReply: ${firstReply}` },
  ], 24);

  return title
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 80) || "new chat";
}

export async function* streamReply(messages: MessageRow[], userText: string) {
  const res = await postCompletion(payload([
    { role: "system", content: SYSTEM },
    { role: "user", content: contextFromMessages(messages, userText) },
  ], 220, true));
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let thinking = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        let delta = parsed?.choices?.[0]?.delta?.content ?? "";
        if (!delta) continue;
        if (delta.includes("<think>")) thinking = true;
        if (thinking) {
          if (delta.includes("</think>")) {
            thinking = false;
            delta = delta.split("</think>").slice(1).join("</think>");
          } else {
            continue;
          }
        }
        if (delta) yield delta;
      } catch {}
    }
  }
}
