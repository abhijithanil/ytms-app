import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { fetchQuestions, submitEvaluation, type EvaluationResult } from './api';

function useRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  async function start() {
    setPermissionError(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorderRef.current = mr;
    chunksRef.current = [];

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => setIsRecording(false);

    mr.start();
    setIsRecording(true);
  }

  async function stop(): Promise<Blob> {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr) return resolve(new Blob());
      mr.onstop = () => {
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        resolve(blob);
      };
      mr.stop();
      mr.stream.getTracks().forEach((t) => t.stop());
    });
  }

  return { start, stop, isRecording, permissionError, setPermissionError };
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  speechSynthesis.speak(utter);
}

function App() {
  const [part, setPart] = useState<'1' | '2' | '3'>('1');
  const [questions, setQuestions] = useState<string[]>([]);
  const [question, setQuestion] = useState<string>('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const { start, stop, isRecording, setPermissionError, permissionError } = useRecorder();

  useEffect(() => {
    fetchQuestions(part).then((d) => {
      setQuestions(d.questions);
      setQuestion(d.questions[0] ?? '');
    });
  }, [part]);

  useEffect(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (audioBlob) setAudioUrl(URL.createObjectURL(audioBlob));
  }, [audioBlob]);

  const canSubmit = useMemo(() => !!question && !!audioBlob && !loading, [question, audioBlob, loading]);

  async function handleStart() {
    try {
      await start();
    } catch (e: any) {
      setPermissionError(e?.message ?? 'Microphone permission denied');
    }
  }

  async function handleStop() {
    const blob = await stop();
    setAudioBlob(blob);
  }

  async function handleSubmit() {
    if (!audioBlob) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await submitEvaluation({ questionText: question, part, blob: audioBlob });
      const r = res.result;
      setResult(r);
      if (r?.feedbackVoiceText) speak(r.feedbackVoiceText);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? 'Submit failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>IELTS Speaking Coach</h1>

      <div className="panel">
        <div className="row">
          <label>Part</label>
          <select value={part} onChange={(e) => setPart(e.target.value as any)}>
            <option value="1">Part 1</option>
            <option value="2">Part 2</option>
            <option value="3">Part 3</option>
          </select>
        </div>

        <div className="row">
          <label>Question</label>
          <select value={question} onChange={(e) => setQuestion(e.target.value)}>
            {questions.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel">
        <div className="row">
          {!isRecording ? (
            <button onClick={handleStart}>Start Recording</button>
          ) : (
            <button className="danger" onClick={handleStop}>
              Stop
            </button>
          )}
          {permissionError && <span className="error">{permissionError}</span>}
        </div>

        {audioUrl && (
          <div className="row">
            <audio controls src={audioUrl} />
            <button onClick={() => setAudioBlob(null)}>Discard</button>
          </div>
        )}

        <div className="row">
          <button disabled={!canSubmit} onClick={handleSubmit}>
            {loading ? 'Evaluating…' : 'Submit'}
          </button>
        </div>
      </div>

      {error && <div className="error panel">{error}</div>}

      {result && (
        <div className="panel">
          <h2>Results</h2>
          <div className="grid">
            <div>
              <h3>Band Score</h3>
              <p>{result.bandScore}</p>
              <h3>Transcript</h3>
              <p>{result.transcript || '—'}</p>
              <h3>Pronunciation</h3>
              <p>{result.pronunciationFeedback || '—'}</p>
              <h3>Coherence & Cohesion</h3>
              <p>{result.coherenceCohesionFeedback || '—'}</p>
            </div>
            <div>
              <h3>Grammar Fixes</h3>
              <ul>
                {Array.isArray(result.grammarFixes) && result.grammarFixes.length > 0 ? (
                  result.grammarFixes.map((g, i) => (
                    <li key={i}>
                      <strong>{g.original}</strong> → {g.improved}
                      <div className="muted">{g.rationale}</div>
                    </li>
                  ))
                ) : (
                  <li>—</li>
                )}
              </ul>
              <h3>Vocabulary Suggestions</h3>
              <ul>
                {Array.isArray(result.vocabularySuggestions) && result.vocabularySuggestions.length > 0 ? (
                  (result.vocabularySuggestions as any[]).map((v: any, i: number) => (
                    <li key={i}>{typeof v === 'string' ? v : `${v.term}: ${v.example}`}</li>
                  ))
                ) : (
                  <li>—</li>
                )}
              </ul>
              <h3>Model Answer</h3>
              <p>{result.suggestedModelAnswer || '—'}</p>
            </div>
          </div>
          <div className="row">
            <button onClick={() => result?.feedbackVoiceText && speak(result.feedbackVoiceText)}>Play Feedback</button>
          </div>
        </div>
      )}

      <footer>
        API: {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}
      </footer>
    </div>
  );
}

export default App;
