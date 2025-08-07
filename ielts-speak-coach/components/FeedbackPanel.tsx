"use client";

import React, { useEffect, useMemo, useState } from "react";

export type Feedback = {
  bandEstimate: number;
  strengths: string[];
  improvements: string[];
  band9Rephrase: string;
  pronunciation: string;
  vocabSuggestions: string[] | string;
};

export default function FeedbackPanel({ question, transcript }: { question: string; transcript: string; }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const normalizedVocab = useMemo(() => {
    if (!feedback) return [] as string[];
    return Array.isArray(feedback.vocabSuggestions)
      ? feedback.vocabSuggestions
      : String(feedback.vocabSuggestions)
          .split(/[\,\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
  }, [feedback]);

  async function fetchFeedback() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, transcript }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `Feedback failed (${res.status})`);
      }
      const data = (await res.json()) as Feedback;
      setFeedback(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to get feedback";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function speakFeedback() {
    if (!feedback) return;
    const text = `Estimated band ${feedback.bandEstimate}. Strengths: ${feedback.strengths.join("; ")}. Improvements: ${feedback.improvements.join("; ")}. Pronunciation: ${feedback.pronunciation}.`;
    try {
      setSpeaking(true);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.status === 501 || !res.ok) {
        // Browser fallback
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const utter = new SpeechSynthesisUtterance(text);
          utter.rate = 1;
          utter.pitch = 1;
          utter.onend = () => setSpeaking(false);
          speechSynthesis.speak(utter);
        } else {
          throw new Error("TTS unavailable");
        }
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => setSpeaking(false);
        audio.play();
      }
    } catch {
      setSpeaking(false);
    }
  }

  useEffect(() => {
    setFeedback(null);
    setError(null);
  }, [transcript, question]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          disabled={!transcript || loading}
          onClick={fetchFeedback}
          className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50 hover:bg-indigo-700"
        >
          {loading ? "Analyzing..." : "Get Feedback"}
        </button>
        <button
          disabled={!feedback || speaking}
          onClick={speakFeedback}
          className="px-4 py-2 rounded border border-gray-300 disabled:opacity-50"
        >
          {speaking ? "Speaking..." : "Speak Feedback"}
        </button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {feedback && (
        <div className="rounded border p-4 space-y-3 bg-white">
          <div className="text-sm text-gray-600">Estimated band: <span className="font-semibold">{feedback.bandEstimate}</span></div>
          <div>
            <div className="font-medium">Strengths</div>
            <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
              {feedback.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium">Improvements</div>
            <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
              {feedback.improvements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium">Band 9 Rephrase</div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{feedback.band9Rephrase}</p>
          </div>
          <div>
            <div className="font-medium">Pronunciation</div>
            <p className="text-sm text-gray-800">{feedback.pronunciation}</p>
          </div>
          <div>
            <div className="font-medium">Vocabulary Suggestions</div>
            <div className="flex flex-wrap gap-2 mt-1">
              {normalizedVocab.map((v, i) => (
                <span key={i} className="inline-block text-xs bg-gray-100 px-2 py-1 rounded border">{v}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}