import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export type EvaluationResult = {
  transcript: string;
  bandScore: number;
  grammarFixes: { original: string; improved: string; rationale: string }[];
  vocabularySuggestions: { term: string; example: string }[] | string[];
  pronunciationFeedback: string;
  coherenceCohesionFeedback: string;
  suggestedModelAnswer: string;
  feedbackVoiceText: string;
};

export async function fetchQuestions(part: string) {
  const res = await api.get(`/questions`, { params: { part } });
  return res.data as { part: string; questions: string[] };
}

export async function submitEvaluation(params: { questionText: string; part: string; blob: Blob }) {
  const formData = new FormData();
  formData.append('question_text', params.questionText);
  formData.append('part', params.part);
  formData.append('audio', params.blob, 'answer.webm');
  const res = await api.post('/evaluate', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data as { part: string; question: string; result: EvaluationResult };
}