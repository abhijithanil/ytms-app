import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { text, voice } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "No OPENAI_API_KEY configured for server TTS." },
        { status: 501 }
      );
    }

    const client = new OpenAI({ apiKey });
    const model = (process.env.OPENAI_TTS_MODEL || "tts-1") as string;

    const allowedVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
    type Voice = (typeof allowedVoices)[number];
    const requested: Voice =
      typeof voice === "string" && (allowedVoices as readonly string[]).includes(voice)
        ? (voice as Voice)
        : "alloy";

    const speech = await client.audio.speech.create({
      model,
      input: text,
      voice: requested,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await speech.arrayBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "TTS failed";
    console.error("TTS error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}