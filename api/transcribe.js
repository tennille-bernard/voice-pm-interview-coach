export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PM_GPT_Key}`
    },
    body: req
  });

  const data = await response.json();
  res.status(200).json(data);
}
