export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { audioBase64, language = "en", mimeType = "audio/mp4" } = req.body;
  const apiKey = process.env.DEEPGRAM_API_KEY;
  const binary = Buffer.from(audioBase64, "base64");
  const r = await fetch(`https://api.deepgram.com/v1/listen?model=nova-2&language=${language}&punctuate=true&smart_format=true`, {
    method: "POST",
    headers: { "Authorization": `Token ${apiKey}`, "Content-Type": mimeType },
    body: binary,
  });
  const data = await r.json();
  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
  res.json({ success: true, transcript });
}
