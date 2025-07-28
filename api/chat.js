import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.PM_GPT_Key
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, thread_id } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Invalid or missing messages" });
    }

    // Step 1: Use existing thread_id or create a new thread
    let threadId = thread_id;

    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
    }

    // Step 2: Add new user message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: messages[messages.length - 1].content
    });

    // Step 3: Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.ASSISTANT_ID
    });

    // Step 4: Wait for the run to complete
    let runStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    } while (runStatus.status !== "completed" && runStatus.status !== "failed");

    if (runStatus.status === "failed") {
      return res.status(500).json({ error: "Assistant run failed" });
    }

    // Step 5: Get assistant messages
    const messagesResponse = await openai.beta.threads.messages.list(threadId);
    const assistantMessages = messagesResponse.data.filter(
      msg => msg.role === "assistant"
    );

    const finalMessage = assistantMessages[0];
    const reply = finalMessage.content[0].text.value;

    return res.status(200).json({
      reply,
      thread_id: threadId
    });

  } catch (error) {
    console.error("Assistants API error:", error);
    return res.status(500).json({ error: error.message || "An unexpected error occurred" });
  }
}
