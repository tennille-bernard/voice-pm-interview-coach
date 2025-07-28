import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";

const openai = new OpenAI({
  apiKey: process.env.PM_GPT_KEY
});

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  try {
    const body = await req.json();
    const { transcript, threadId: existingThreadId } = body;

    if (!transcript || transcript.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Transcript is missing or invalid", text: transcript }),
        { status: 400 }
      );
    }

    const assistantId = process.env.ASSISTANT_ID;
    if (!assistantId) {
      return new Response(
        JSON.stringify({ error: "Missing assistant_id environment variable" }),
        { status: 500 }
      );
    }

    let thread;
    if (existingThreadId) {
      thread = { id: existingThreadId };
    } else {
      thread = await openai.beta.threads.create();
    }

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: transcript
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    while (runStatus.status !== "completed" && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    if (runStatus.status !== "completed") {
      return new Response(
        JSON.stringify({ error: "Run did not complete in time" }),
        { status: 500 }
      );
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const responseMessage = messages.data.find(msg => msg.role === "assistant" && msg.content.length > 0);

    if (!responseMessage) {
      return new Response(
        JSON.stringify({ error: "Chat API returned no choices" }),
        { status: 500 }
      );
    }

    const responseText = responseMessage.content[0]?.text?.value || "";

    return new Response(
      JSON.stringify({ response: responseText, threadId: thread.id }),
      { status: 200 }
    );

  } catch (error) {
    console.error("Assistants API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500 }
    );
  }
}
