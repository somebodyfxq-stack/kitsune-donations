import { TextToSpeechClient } from "@google-cloud/text-to-speech";
export const runtime = "nodejs";

const client = new TextToSpeechClient();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text") ?? "";
  const voice = searchParams.get("voice") ?? "uk-UA-Standard-A";
  if (!text) return new Response("Missing text", { status: 400 });
  try {
    const [res] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: voice.split("-").slice(0, 2).join("-"),
        name: voice,
      },
      audioConfig: { audioEncoding: "MP3" },
    });
    const audio = res.audioContent ?? new Uint8Array();
    return new Response(Buffer.from(audio), {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    console.error("Failed to synthesize speech", err);
    return new Response("TTS error", { status: 500 });
  }
}
