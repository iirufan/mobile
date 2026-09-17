import { EdgeTTS } from "edge-tts-universal";

const VOICES = {
  "ru-RU": "ru-RU-SvetlanaNeural",
  "zh-CN": "zh-CN-XiaoxiaoNeural",
  "ar-SA": "ar-SA-ZariyahNeural"
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const text = String(body.text || "").trim();
    const lang = String(body.lang || "").trim();

    if (!text) return res.status(400).json({ error: "Announcement text is required." });
    if (text.length > 3000) return res.status(400).json({ error: "Announcement is too long." });

    const voice = VOICES[lang];
    if (!voice) return res.status(400).json({ error: "Unsupported TTS language." });

    const tts = new EdgeTTS(text, voice, {
      rate: "+0%",
      volume: "+0%",
      pitch: "+0Hz"
    });

    const result = await tts.synthesize();
    const audioBuffer = Buffer.from(await result.audio.arrayBuffer());

    if (!audioBuffer.length) throw new Error("No audio was generated.");

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(audioBuffer.length));
    return res.status(200).send(audioBuffer);
  } catch (error) {
    console.error("Edge TTS error:", error);
    return res.status(500).json({
      error: error?.message || "Microsoft Edge TTS failed."
    });
  }
}
