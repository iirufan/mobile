KOVELI ANNOUNCEMENT - EDGE TTS

Files:
  index.html
  api/tts.js
  package.json
  vercel.json

Deploy the whole folder to Vercel.

No TTS API key is required.

Audio:
- English: existing browser / Windows speechSynthesis reader.
- Russian: ru-RU-SvetlanaNeural via server-side Edge TTS.
- Chinese Mandarin: zh-CN-XiaoxiaoNeural via server-side Edge TTS.
- Arabic: ar-SA-ZariyahNeural via server-side Edge TTS.
- Dhivehi: device/browser fallback only.

IMPORTANT:
Foreign-language Edge TTS requires /api/tts, so it will not work if index.html
is opened by VS Code Live Server alone at 127.0.0.1:5500.
Use the deployed Vercel URL, or run the full Vercel project locally.
