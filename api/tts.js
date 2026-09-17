import { UniversalEdgeTTS } from "edge-tts-universal";

const VOICES = Object.freeze({
  "ru-RU": "ru-RU-SvetlanaNeural",
  "zh-CN": "zh-CN-XiaoxiaoNeural",
  "ar-SA": "ar-SA-ZariyahNeural"
});

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "Koveli Edge TTS",
      languages: Object.keys(VOICES)
    });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const text = String(body.text || "").trim();
    const lang = String(body.lang || "").trim();
    const voice = VOICES[lang];

    if (!text) return res.status(400).json({ error: "Text is required." });
    if (!voice) return res.status(400).json({ error: `Unsupported language: ${lang}` });
    if (text.length > 3500) return res.status(400).json({ error: "Text is too long." });

    const tts = new UniversalEdgeTTS(text, voice, {
      rate: "+0%",
      volume: "+0%",
      pitch: "+0Hz"
    });

    const result = await tts.synthesize();
    if (!result?.audio) throw new Error("No audio object returned by Edge TTS.");

    const arrayBuffer = await result.audio.arrayBuffer();
    const audio = Buffer.from(arrayBuffer);
    if (audio.length < 100) throw new Error("Edge TTS returned empty audio.");

    res.statusCode = 200;
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(audio.length));
    res.setHeader("X-Koveli-Voice", voice);
    return res.end(audio);
  } catch (err) {
    console.error("KOVELI_EDGE_TTS_ERROR", err);
    return res.status(500).json({
      error: err?.message || "Edge TTS synthesis failed."
    });
  }
}
