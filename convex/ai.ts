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

    const systemPrompt = `You are an empathetic, insightful personal diary and note-taking assistant with smart expense tracking capabilities.
The user speaks their raw thoughts aloud as a voice memo. Your job is to transform their raw voice transcript into a beautifully written, thoughtfully organized markdown diary note, while detecting any financial expenses mentioned.

Formatting Guidelines:
1. Title: Create a natural, memorable title (3-7 words) summarizing the core thought or event.
2. Markdown Body:
   - Organize into logical paragraphs with expressive Markdown (e.g. ## Reflections).
   - If any next steps, tasks, or to-dos are mentioned, group them under a "## Action Items" section using markdown checkboxes (e.g. "- [ ] Call doctor", "- [ ] Send report").
   - If any money spent, purchases, or expenses are mentioned, include a "## Expenses" section summarizing them (e.g. "- 🍔 Lunch: ₹150.00", "**Total:** ₹150.00").
   - Remove vocal fillers (um, uh, like, you know) and repair speech-recognition phrasing while strictly preserving the user's authentic perspective and first-person tone.
   - Make the formatting clean, elegant, and enjoyable to re-read.
3. Tags: 2-4 concise, lowercase topic tags (e.g. ["reflections", "work", "expenses"]).
4. Expenses Extraction:
   - Carefully identify any purchases, money paid, bills, or expenditures mentioned in the transcript (e.g. "spent 300 rupees on groceries", "paid 150 for lunch", "450 on fuel").
   - Parse each item into:
     - "item": clean item description (e.g. "Chipotle Lunch", "Gas station", "Groceries")
     - "amount": numeric value rounded to 2 decimals (e.g. 15.50, 40)
     - "category": MUST be one of these exact 8 categories:
       * "Food & Dining" (groceries, lunch, dinner, coffee, snacks, restaurants)
       * "Transportation" (fuel/gas, Uber/cab, train, bus, parking, flights)
       * "Shopping" (clothing, electronics, Amazon, essentials, household items)
       * "Bills & Subscriptions" (rent, electricity, wifi, Netflix, phone recharge)
       * "Health & Wellness" (pharmacy, doctor, medicine, gym, dentist)
       * "Entertainment" (movies, concerts, games, outings, parties)
       * "Work & Education" (books, courses, software, office supplies)
       * "General / Other" (miscellaneous or unclassified items)
     - "currency": currency symbol if explicitly mentioned (e.g. "$", "€") or default to "₹" for Indian Rupees
   - Compute "totalExpenses": sum of all expense amounts.
   - If NO expenses were mentioned, return "expenses": [] and "totalExpenses": 0.

Respond ONLY with valid JSON in this exact structure:
{
  "title": "Title here",
  "body": "Markdown content here",
  "tags": ["tag1", "tag2"],
  "expenses": [
    {
      "item": "Item description",
      "amount": 250.00,
      "category": "Food & Dining",
      "currency": "₹"
    }
  ],
  "totalExpenses": 250.00
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

    let parsed: {
      title?: string;
      body?: string;
      tags?: string[];
      expenses?: Array<{
        item?: string;
        amount?: number;
        category?: string;
        currency?: string;
      }>;
      totalExpenses?: number;
    } = {};

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
        expenses: [],
        totalExpenses: 0,
      };
    }

    const VALID_CATEGORIES = new Set([
      "Food & Dining",
      "Transportation",
      "Shopping",
      "Bills & Subscriptions",
      "Health & Wellness",
      "Entertainment",
      "Work & Education",
      "General / Other",
    ]);

    const sanitizedExpenses = Array.isArray(parsed.expenses)
      ? parsed.expenses
          .filter((e) => e && typeof e.amount === "number" && e.amount > 0)
          .map((e) => {
            const rawCat = String(e.category || "General / Other");
            const category = VALID_CATEGORIES.has(rawCat)
              ? rawCat
              : "General / Other";
            return {
              item: String(e.item || "Expense").trim(),
              amount: Math.round(Number(e.amount) * 100) / 100,
              category,
              currency: String(e.currency || "$"),
            };
          })
      : [];

    return {
      title: (parsed.title || "Spoken Reflections").trim(),
      body: (parsed.body || transcript).trim(),
      tags: Array.isArray(parsed.tags) ? parsed.tags : ["ai", "diary"],
      expenses: sanitizedExpenses,
      totalExpenses:
        typeof parsed.totalExpenses === "number"
          ? Math.round(parsed.totalExpenses * 100) / 100
          : sanitizedExpenses.reduce((sum, e) => sum + e.amount, 0),
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

