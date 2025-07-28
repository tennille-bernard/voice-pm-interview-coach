import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const form = new formidable.IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ error: "Form parsing failed" });
    }

    const audioFile = files.file;
    if (!audioFile) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    try {
      const fileStream = fs.createReadStream(audioFile.filepath);

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: (() => {
          const formData = new FormData();
          formData.append("file", fileStream, audioFile.originalFilename);
          formData.append("model", "whisper-1");
          return formData;
        })(),
      });

      const data = await response.json();
      res.status(200).json(data);
    } catch (err) {
      console.error("Transcription error:", err);
      res.status(500).json({ error: "Transcription failed" });
    }
  });
}
