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
    const voice = searchParams.get("voice") ?? "uk-UA-Standard-A";
    
    if (!text) {
      console.warn("TTS: Missing text parameter");
      return new Response("Missing text", { status: 400 });
    }

    console.log(`TTS: Synthesizing text (${text.length} chars) with voice: ${voice}`);
    
    const [res] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: voice.split("-").slice(0, 2).join("-"),
        name: voice,
      },
      audioConfig: { 
        audioEncoding: "MP3",
        speakingRate: 1.0, // Нормальна швидкість
        pitch: 0.0, // Нормальна висота тону
      },
    });
    
    const audio = res.audioContent ?? new Uint8Array();
    console.log(`TTS: Successfully generated ${audio.length} bytes of audio`);
    
    return new Response(Buffer.from(audio), {
      headers: { 
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600", // Кешуємо на 1 годину
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
