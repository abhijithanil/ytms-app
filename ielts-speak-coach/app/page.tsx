import QuestionCard from "@/components/QuestionCard";

export default function Page() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">IELTS Speaking Coach</h1>
          <p className="text-gray-600 text-sm">Practice questions, record your answers, and receive instant, voice-delivered feedback to reach Band 9.</p>
        </header>

        <div className="rounded-lg border bg-white p-4">
          <QuestionCard />
        </div>

        <section className="text-xs text-gray-500">
          <p>
            Tip: For best results, use a headset microphone. If server transcription or TTS is unavailable, you can edit your transcript manually and use your browser&apos;s voice to speak feedback.
          </p>
        </section>
      </div>
    </main>
  );
}
