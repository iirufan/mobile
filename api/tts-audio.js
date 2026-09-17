// Vercel Serverless Function: /api/tts-audio
module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end("Method not allowed");
  const id = String(req.query.id || "").trim();
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return res.status(400).end("Invalid audio id");

  try {
    const upstream = await fetch(`https://freetts.org/api/audio/${encodeURIComponent(id)}`);
    if (!upstream.ok) return res.status(upstream.status).end("Audio unavailable");

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.status(200).send(buf);
  } catch (e) {
    console.error("Audio proxy error:", e);
    return res.status(500).end("Audio proxy failed");
  }
};
