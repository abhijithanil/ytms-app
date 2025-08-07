"use client";

import React, { useEffect, useRef, useState } from "react";

export type TranscribeResult = { transcript: string };

export type RecorderProps = {
  onTranscript: (transcript: string, audioUrl: string | null) => void;
  speakingSeconds?: number;
  autoStop?: boolean;
};

export default function Recorder({ onTranscript, speakingSeconds = 90, autoStop = false }: RecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState<number>(speakingSeconds);

  useEffect(() => {
    if (!isRecording || !autoStop) return;
    setTimer(speakingSeconds);
    const id = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          stopRecording();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRecording, autoStop, speakingSeconds]);

  async function startRecording() {
    setError(null);
    setTranscript(null);
    setAudioUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        void sendForTranscription(blob);
      };
      mr.start();
      setIsRecording(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Microphone access denied";
      setError(message);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
  }

  async function sendForTranscription(blob: Blob) {
    setError(null);
    try {
      const form = new FormData();
      const file = new File([blob], "answer.webm", { type: "audio/webm" });
      form.append("audio", file);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      if (res.ok) {
        const data = (await res.json()) as TranscribeResult;
        setTranscript(data.transcript);
        onTranscript(data.transcript, audioUrl);
      } else if (res.status === 501) {
        // Server STT unavailable; allow manual transcript later
        setTranscript("");
        onTranscript("", audioUrl);
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `Transcription failed (${res.status})`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Transcription error";
      setError(message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {!isRecording ? (
          <button onClick={startRecording} className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">Start Recording</button>
        ) : (
          <button onClick={stopRecording} className="px-4 py-2 rounded bg-rose-600 text-white hover:bg-rose-700">Stop</button>
        )}
        {autoStop && isRecording && (
          <span className="text-sm text-gray-600">Time left: {timer}s</span>
        )}
      </div>

      {audioUrl && (
        <audio controls src={audioUrl} className="w-full" />
      )}

      {typeof transcript === "string" && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Transcript (edit if needed)</label>
          <textarea
            className="w-full border rounded p-2 min-h-[120px]"
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              onTranscript(e.target.value, audioUrl);
            }}
            placeholder="Your transcript will appear here. If empty, type what you said."
          />
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}