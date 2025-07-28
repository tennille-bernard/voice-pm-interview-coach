// /api/transcribe.js

export const config = {
  api: {
    bodyParser: false,
  },
};

import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";

// Dynamically import formidable for ESM compatibility
const formidableModule = await import("formidable");
const IncomingForm = formidableModule.default;

const openaiApiKey = process.env.PM_GPT_Key;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new IncomingForm({ maxFileSize: 20 * 1024 * 1024 });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(400).json({ error: "Failed to parse uploaded file" });
    }

    if (!files || !files.file || !files.file[0]) {
      console.error("No file uploaded:", files);
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const file = files.file[0];
      const buffer = fs.readFileSync(file.filepath);

      const formData = new FormData();
      formData.append("file", buffer, {
        filename: "audio.webm",
        contentType: "audio/webm",
      });
      formData.append("model", "whisper-1");

      const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      const whisperData = await whisperRes.json();

      if (!whisperData.text) {
        console.error("OpenAI Whisper returned empty response:", whisperData);
        return res.status(500).json({ text: "" });
      }

      res.status(200).json({ text: whisperData.text });
    } catch (error) {
      console.error("Transcription processing error:", error);
      res.status(500).json({ error: "Server error during transcription" });
    }
  });
}
