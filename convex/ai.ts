import { action } from "./_generated/server";
import { v } from "convex/values";

export const generateNote = action({
  args: {
    transcript: v.string(),
    baseUrl: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { transcript, baseUrl, apiKey, model }) => {
    if (!transcript.trim()) {
      throw new Error("Transcript is empty");
    }

    const finalBaseUrl =
      baseUrl ||
      process.env.AI_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      "https://api.openai.com/v1";

    const finalApiKey =
      apiKey ||
      process.env.AI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "";

    const finalModel = model || "openai/gpt-oss-20b";

    if (!finalApiKey) {
      throw new Error(
        "AI API key is missing. Please set AI_API_KEY in Convex or .env"
      );
    }

    const url = `${finalBaseUrl.replace(/\/+$/, "")}/chat/completions`;

    const systemPrompt = `You are an empathetic, insightful personal diary and note-taking assistant.
The user speaks their raw thoughts aloud as a voice memo. Your job is to transform their raw voice transcript into a beautifully written, thoughtfully organized markdown diary note.

Formatting Guidelines:
1. Title: Create a natural, memorable title (3-7 words) summarizing the core thought or event.
2. Markdown Body:
   - Organize into logical paragraphs with expressive Markdown (e.g. ## Reflections).
   - If any next steps, tasks, or to-dos are mentioned, group them under a "## Action Items" section using markdown checkboxes (e.g. "- [ ] Call doctor", "- [ ] Send report").
   - Remove vocal fillers (um, uh, like, you know) and repair speech-recognition phrasing while strictly preserving the user's authentic perspective and first-person tone.
   - Make the formatting clean, elegant, and enjoyable to re-read.
3. Tags: 2-4 concise, lowercase topic tags (e.g. ["reflections", "work", "ideas"]).

Respond ONLY with valid JSON in this exact structure:
{
  "title": "Title here",
  "body": "Markdown content here",
  "tags": ["tag1", "tag2"]
}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${finalApiKey}`,
      },
      body: JSON.stringify({
        model: finalModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Provider error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";

    let parsed: { title?: string; body?: string; tags?: string[] } = {};
    try {
      const cleaned = content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const firstLine = content.split("\n")[0].replace(/^#+\s*/, "").trim();
      parsed = {
        title: firstLine || "Spoken Reflections",
        body: content,
        tags: ["voice-note", "ai"],
      };
    }

    return {
      title: (parsed.title || "Spoken Reflections").trim(),
      body: (parsed.body || transcript).trim(),
      tags: Array.isArray(parsed.tags) ? parsed.tags : ["ai", "diary"],
    };
  },
});

export const listModels = action({
  args: {
    baseUrl: v.optional(v.string()),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, { baseUrl, apiKey }) => {
    const finalBaseUrl =
      baseUrl ||
      process.env.AI_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      "https://api.openai.com/v1";

    const finalApiKey =
      apiKey ||
      process.env.AI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "";

    if (!finalApiKey) {
      return [];
    }

    const url = `${finalBaseUrl.replace(/\/+$/, "")}/models`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${finalApiKey}`,
        },
      });

      if (!res.ok) {
        return [];
      }

      const json = (await res.json()) as { data?: Array<{ id: string }> };
      if (!Array.isArray(json.data)) return [];

      const excluded = [
        "whisper",
        "guard",
        "safeguard",
        "embedding",
        "moderation",
        "tts",
        "dall-e",
        "audio",
        "embed",
      ];
      const models = json.data
        .map((m) => m.id)
        .filter((id) => !excluded.some((ex) => id.toLowerCase().includes(ex)))
        .sort();

      return models;
    } catch {
      return [];
    }
  },
});

