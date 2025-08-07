"use client";

import React, { useMemo, useState } from "react";
import { getRandomQuestion, IeltsPart } from "@/lib/questions";
import Recorder from "./Recorder";
import FeedbackPanel from "./FeedbackPanel";

export default function QuestionCard() {
  const [part, setPart] = useState<IeltsPart>("part1");
  const [question, setQuestion] = useState(() => getRandomQuestion("part1"));
  const [transcript, setTranscript] = useState<string>("");

  const speakingSeconds = useMemo(() => (part === "part2" ? 120 : 90), [part]);

  function nextQuestion() {
    setQuestion(getRandomQuestion(part));
    setTranscript("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">IELTS Part</label>
          <select
            className="border rounded px-2 py-1"
            value={part}
            onChange={(e) => {
              const p = e.target.value as IeltsPart;
              setPart(p);
              setQuestion(getRandomQuestion(p));
              setTranscript("");
            }}
          >
            <option value="part1">Part 1 (Intro)</option>
            <option value="part2">Part 2 (Long Turn)</option>
            <option value="part3">Part 3 (Discussion)</option>
          </select>
        </div>
        <button onClick={nextQuestion} className="px-3 py-1.5 rounded border">New Question</button>
      </div>

      <div className="rounded border p-4 bg-white space-y-2">
        <div className="text-sm text-gray-500">Question</div>
        <div className="text-lg font-medium">{question.prompt}</div>
        {question.guidance && (
          <p className="text-sm text-gray-700">{question.guidance}</p>
        )}
      </div>

      <Recorder
        speakingSeconds={speakingSeconds}
        autoStop={part !== "part1"}
        onTranscript={(t) => setTranscript(t)}
      />

      <FeedbackPanel question={question.prompt} transcript={transcript} />
    </div>
  );
}