// /api/chat.js
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.PM_GPT_Key });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body;

  try {
    const assistantId = process.env.ASSISTANT_ID;

    // 1. Create a thread
    const thread = await openai.beta.threads.create();

    // 2. Add user message
    const userInput = messages?.[0]?.content || "";
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userInput,
    });

    // 3. Run assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // 4. Poll until complete
    let status = "in_progress";
    let runResult;
    while (status !== "completed" && status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runResult = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      status = runResult.status;
    }

    if (status === "failed") {
      console.error("Run failed", runResult);
      return res.status(500).json({ error: "Assistant run failed" });
    }

    // 5. Get assistant reply
    const messagesRes = await openai.beta.threads.messages.list(thread.id);
    const replyMessage = messagesRes.data.find(m => m.role === "assistant");
    const reply = replyMessage?.content?.[0]?.text?.value || "No response.";

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("Assistants API error:", err);
    return res.status(500).json({ error: "Failed to query Assistant" });
  }
}
