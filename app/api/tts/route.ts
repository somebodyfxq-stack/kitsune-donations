import { TextToSpeechClient } from "@google-cloud/text-to-speech";
export const runtime = "nodejs";

declare global {
  // eslint-disable-next-line no-var
  var ttsClient: TextToSpeechClient | undefined;
}

function getTtsClient(): TextToSpeechClient {
  if (!globalThis.ttsClient) {
    // Підтримка двох способів налаштування credentials
    const credentials = process.env.GOOGLE_CLOUD_PRIVATE_KEY ? {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: {
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }
    } : undefined; // Використовувати GOOGLE_APPLICATION_CREDENTIALS якщо env vars не задані

    globalThis.ttsClient = new TextToSpeechClient(credentials);
  }
  return globalThis.ttsClient;
}

export async function GET(req: Request) {
  try {
    const client = getTtsClient();
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text") ?? "";
    const voiceParam = searchParams.get("voice");
    const voice = (!voiceParam || voiceParam.trim() === "") ? "uk-UA-Standard-A" : voiceParam;
    const quality = searchParams.get("quality") ?? "optimal"; // optimal, high, fast
    
    if (!text) {
      console.warn("TTS: Missing text parameter");
      return new Response("Missing text", { status: 400 });
    }

    console.log(`TTS: Synthesizing text (${text.length} chars) with voice: ${voice}, quality: ${quality}`);
    
    // Конфігурації якості на основі best practices
    const getAudioConfig = (quality: string) => {
      switch (quality) {
        case "high": // Максимальна якість (LINEAR16 як FLAC-еквівалент)
          return {
            audioEncoding: "LINEAR16" as const,
            speakingRate: 0.95,
            pitch: 0.0,
            sampleRateHertz: 48000, // 48kHz для найвищої якості
            volumeGainDb: -1.0,
            effectsProfileId: ["headphone-class-device"]
          };
          
        case "fast": // Швидко та мало місця (MP3)
          return {
            audioEncoding: "MP3" as const,
            speakingRate: 1.0,
            pitch: 0.0,
            sampleRateHertz: 16000, // 16kHz для швидкості
            volumeGainDb: -2.0,
            effectsProfileId: ["telephony-class-application"]
          };
          
        default: // "optimal" - тепер використовуємо LINEAR16 для кращої якості
          return {
            audioEncoding: "LINEAR16" as const,
            speakingRate: 0.98,
            pitch: 0.0,
            sampleRateHertz: 48000, // 48kHz для найвищої якості
            volumeGainDb: -1.5,
            effectsProfileId: ["headphone-class-device"]
          };
      }
    };
    
    const audioConfig = getAudioConfig(quality);
    
    const [res] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: voice.split("-").slice(0, 2).join("-"),
        name: voice,
      },
      audioConfig,
    });
    
    const audio = res.audioContent ?? new Uint8Array();
    console.log(`TTS: Successfully generated ${audio.length} bytes of audio`);
    
    // Встановлюємо правильний Content-Type залежно від формату
    const getContentType = (encoding: string) => {
      switch (encoding) {
        case "LINEAR16": return "audio/wav";
        case "MP3": return "audio/mpeg";
        case "OGG_OPUS": return "audio/ogg; codecs=opus";
        case "FLAC": return "audio/flac";
        default: return "audio/wav"; // За замовчуванням тепер LINEAR16 (WAV)
      }
    };
    
    const contentType = getContentType(audioConfig.audioEncoding);
    
    return new Response(audio, {
      headers: { 
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // Кешуємо на 1 годину
        "Accept-Ranges": "bytes", // Підтримка часткового завантаження
      },
    });
  } catch (err: any) {
    console.error("TTS: Failed to synthesize speech", {
      error: err.message,
      code: err.code,
      details: err.details,
    });
    
    // Перевіряємо чи це проблема з credentials
    if (err.code === 'UNAUTHENTICATED' || err.message?.includes('credentials')) {
      console.error("TTS: Authentication failed. Please check your Google Cloud credentials.");
      return new Response("TTS authentication error - check server logs", { status: 401 });
    }
    
    return new Response("TTS error - check server logs", { status: 500 });
  }
}
