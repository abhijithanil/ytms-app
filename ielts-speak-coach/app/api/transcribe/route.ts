import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const form = await req.formData();
    const audio = form.get("audio") as File | null;

    if (!audio) {
      return NextResponse.json({ error: "Missing audio" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "No OPENAI_API_KEY configured. Unable to transcribe on the server.",
        },
        { status: 501 }
      );
    }

    const client = new OpenAI({ apiKey });

    // Prefer gpt-4o-mini-transcribe when available, otherwise whisper-1
    const model = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";

    const response = await client.audio.transcriptions.create({
      file: audio,
      model,
      // language can be left auto, but IELTS is English
      // response_format: "verbose_json" // optional
    });

    type MaybeWhisperResponse = {
      text?: string;
      results?: Array<{ alternatives?: Array<{ transcript?: string }> }>;
    };
    const r = response as unknown as MaybeWhisperResponse;
    const text = r.text ?? r.results?.[0]?.alternatives?.[0]?.transcript ?? "";

    return NextResponse.json({ transcript: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    console.error("Transcription error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}