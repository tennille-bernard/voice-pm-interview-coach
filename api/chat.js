export default async function handler(req, res) {
  const apiKey = process.env.PM_GPT_Key;

  if (!apiKey) {
    return res.status(500).json({ error: "Missing OpenAI API key" });
  }

  const { messages } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({ error: data });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("API call failed:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
