import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.PM_GPT_Key });

let threadId = null;
let questionNumber = 1;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, reset } = req.body;

    if (reset || !threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      questionNumber = 1;
    }

    const message = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: messages[messages.length - 1].content,
    });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    let runStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    } while (runStatus.status !== "completed");

    const responseMessages = await openai.beta.threads.messages.list(threadId);
    const lastMessage = responseMessages.data.find(m => m.role === "assistant");

    res.status(200).json({
      choices: [
        {
          message: {
            content: `Question ${questionNumber++}: ${lastMessage.content[0].text.value}`,
          },
        },
      ],
    });
  } catch (error) {
    console.error("Assistants API error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
