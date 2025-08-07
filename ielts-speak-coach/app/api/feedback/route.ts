import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fallbackFeedback(question: string, transcript: string) {
  const lower = transcript.toLowerCase();
  const fillerWords = ["um", "uh", "like", "you know", "sort of", "kind of"]; 
  const fillersFound = fillerWords.filter((w) => lower.includes(w));

  const simpleToAdvanced: Record<string, string> = {
    "good": "commendable / admirable",
    "bad": "detrimental / suboptimal",
    "very": "highly / immensely",
    "big": "substantial / significant",
    "small": "minimal / modest",
    "a lot": "a great deal / considerably",
    "think": "contend / maintain / believe",
    "get": "obtain / receive / achieve",
  };

  const suggestions = Object.entries(simpleToAdvanced)
    .filter(([k]) => lower.includes(k))
    .map(([k, v]) => `Consider replacing "${k}" with ${v}.`);

  const bandEstimate = transcript.split(/\s+/).length > 120 ? 6.5 : 6.0;

  return {
    bandEstimate,
    strengths: [
      "Ideas are generally relevant to the prompt.",
      "Coherent flow at sentence level.",
    ],
    improvements: [
      ...suggestions,
      fillersFound.length
        ? `Reduce filler words: ${fillersFound.join(", ")}.`
        : "Minimize filler words to sound more confident.",
      "Use a wider range of complex sentence structures and discourse markers (e.g., moreover, consequently, nevertheless).",
      "Add precise examples to support claims.",
    ],
    band9Rephrase:
      "Here is a more sophisticated version: In my view, [replace with your idea], primarily because [reason 1]. Moreover, this tendency reflects [broader implication]. For instance, [specific example]. Consequently, [clear conclusion].",
    pronunciation:
      "Aim for clearer word stress and consistent final consonants. Record at a steady pace and enunciate multi-syllabic words.",
    vocabSuggestions: [
      "disparate, ubiquitous, paradigm, nuance, compelling, mitigate, underpin, salient, pivotal, ostensibly, nonetheless",
    ],
  };
}

export async function POST(req: NextRequest) {
  try {
    const { question, transcript } = await req.json();
    if (!transcript) {
      return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(fallbackFeedback(question, transcript));
    }

    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_FEEDBACK_MODEL || "gpt-4o-mini";
    const prompt = `You are an IELTS Speaking examiner and coach. Analyze the candidate\'s answer and provide:
- Estimated band score (one number like 6.5) with brief reason
- Strengths (3 bullets)
- Improvements (4-6 bullets)
- Band 9 rephrase (1-2 short paragraphs)
- Pronunciation notes (2-3 sentences)
- Vocabulary suggestions (10-15 advanced, natural collocations)
Keep it concise, concrete, and IELTS-specific. Question: ${question || "(not provided)"}\nTranscript: ${transcript}`;

    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "Respond in strict JSON with keys: bandEstimate, strengths, improvements, band9Rephrase, pronunciation, vocabSuggestions (array)." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = resp.choices[0]?.message?.content || "{}";
    const json = JSON.parse(content as string);

    return NextResponse.json(json);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Feedback failed";
    console.error("Feedback error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}