// Updated chat.js with reset and question count support

import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";

const openai = new OpenAI({ apiKey: process.env.PM_GPT_Key });

let threadId = null;
let questionCount = 0;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, reset } = req.body;

  try {
    // Reset if flagged
    if (reset) {
      threadId = null;
      questionCount = 0;
    }

    // Create a thread if not already started
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
    }

    // Append new message
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: messages[messages.length - 1].content,
    });

    // Start a run
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.PM_GPT_Assistant_ID,
    });

    // Poll for completion
    let runStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 1500));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    } while (runStatus.status !== "completed" && runStatus.status !== "failed");

    if (runStatus.status === "failed") {
      return res.status(500).json({ error: "Assistant run failed" });
    }

    // Fetch updated messages
    const messagesResponse = await openai.beta.threads.messages.list(threadId);
    const lastMessage = messagesResponse.data.find(msg => msg.role === "assistant");

    // Track question number for display
    questionCount++;

    res.status(200).json({
      choices: [
        {
          message: {
            content: `Q${questionCount}: ${lastMessage.content[0].text.value}`,
          },
        },
      ],
      questionNumber: questionCount,
    });
  } catch (error) {
    console.error("Assistants API error:", error);
    res.status(500).json({ error: "Server error" });
  }
}
