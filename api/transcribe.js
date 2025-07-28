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
    if (err) {
      console.error("Form parse error:", err);
      return res.status(400).json({ error: "Form parsing failed" });
    }

    // ✅ Defensive check (Point 2)
    if (!files || !files.file || !files.file[0]) {
      console.error("No file received:", files);
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      // ✅ Correct file reference and buffer read (Point 3)
      const file = files.file[0];
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
        console.error("Whisper API returned no text:", data);
        return res.status(500).json({ text: "" });
      }

      res.status(200).json({ text: data.text });
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: "Server error during transcription" });
    }
  });
}
