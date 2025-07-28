export default async function handler(req, res) {
  const { messages } = req.body;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PM_GPT_Key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages
    })
  });

  const data = await response.json();
  res.status(200).json(data);
}
