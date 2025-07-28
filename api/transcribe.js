// /api/transcribe.js

export const config = {
  api: {
    bodyParser: false,
  },
};

import formidable from "formidable";
import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";

const openaiApiKey = process.env.PM_GPT_Key;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err || !files.file) {
      console.error("Error parsing form or missing file:", err);
      return res.status(400).json({ error: "No audio file found" });
    }

    const file = files.file[0];

    try {
      const buffer = fs.readFileSync(file.filepath);

      const formData = new FormData();
      formData.append("file", buffer, {
        filename: "audio.webm",
        contentType: "audio/webm",
      });
      formData.append("model", "whisper-1");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      const data = await response.json();

      if (!data.text) {
        console.error("OpenAI Whisper API returned no text:", data);
        return res.status(500).json({ text: "" });
      }

      res.status(200).json({ text: data.text });
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
}
