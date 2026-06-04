export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { audioBase64, language = "en", mimeType = "audio/mp4" } = req.body;
  if (!audioBase64) {
    return res.status(400).json({ error: "audioBase64 is required" });
  }
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "Deepgram API key not configured" });
  }
  try {
    const binary = Buffer.from(audioBase64, "base64");
    const url = `https://api.deepgram.com/v1/listen?model=nova-2&language=${language}&punctuate=true&smart_format=true`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": mimeType,
      },
      body: binary,
    });
    if (!response.ok) {
      const error = await response.text();
      return res.status(502).json({ error });
    }
    const data = await response.json();
    const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
    const confidence = data.results?.channels?.[0]?.alternatives?.[0]?.confidence ?? 0;
    const duration = data.metadata?.duration ?? 0;
    return res.json({ success: true, transcript, confidence, duration });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
