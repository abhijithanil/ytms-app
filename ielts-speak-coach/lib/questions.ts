export type IeltsPart = "part1" | "part2" | "part3";

export type IeltsQuestion = {
  id: string;
  part: IeltsPart;
  prompt: string;
  guidance?: string;
};

const questions: IeltsQuestion[] = [
  {
    id: "p1-hometown-1",
    part: "part1",
    prompt: "Where is your hometown and what do you like most about it?",
  },
  {
    id: "p1-reading-1",
    part: "part1",
    prompt: "Do you enjoy reading? Why or why not?",
  },
  {
    id: "p1-music-1",
    part: "part1",
    prompt: "What kind of music do you like to listen to?",
  },
  {
    id: "p2-event-1",
    part: "part2",
    prompt: "Describe a memorable event in your life.",
    guidance:
      "You should say: what the event was, when and where it happened, what happened, and explain why it was memorable.",
  },
  {
    id: "p2-book-1",
    part: "part2",
    prompt: "Describe a book that left a strong impression on you.",
    guidance:
      "You should say: what the book is, who wrote it, what it is about, and explain why it impressed you.",
  },
  {
    id: "p3-technology-1",
    part: "part3",
    prompt: "How has technology changed the way we communicate?",
  },
  {
    id: "p3-education-1",
    part: "part3",
    prompt: "Do you think traditional classrooms will be replaced by online learning? Why or why not?",
  },
];

export function getRandomQuestion(part: IeltsPart): IeltsQuestion {
  const filtered = questions.filter((q) => q.part === part);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export function getAllQuestions(part?: IeltsPart): IeltsQuestion[] {
  return part ? questions.filter((q) => q.part === part) : questions;
}