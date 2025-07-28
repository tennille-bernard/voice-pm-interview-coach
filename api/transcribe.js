import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // Save the uploaded audio to a temp file
    const tempFilePath = path.join('/tmp', `audio-${Date.now()}.webm`);
    fs.writeFileSync(tempFilePath, buffer);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempFilePath));
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PM_GPT_Key}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    const data = await response.json();
    res.status(200).json({ text: data.text || "" });
  } catch (error) {
    console.error('Error in /api/transcribe:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
}
