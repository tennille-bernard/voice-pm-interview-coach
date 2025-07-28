export default async function handler(req, res) {
  const { identifier } = req.body;
  const GUMROAD_API_KEY = process.env.GUMROAD_API_KEY;

  if (!GUMROAD_API_KEY) {
    return res.status(500).json({ success: false, error: "No Gumroad API key found." });
  }

  const response = await fetch(`https://api.gumroad.com/v2/sales?access_token=${GUMROAD_API_KEY}`);
  const result = await response.json();

  const found = result.sales?.find(sale =>
    sale.email === identifier || sale.id === identifier
  );

  if (found) {
    res.status(200).json({ success: true });
  } else {
    res.status(403).json({ success: false });
  }
}
