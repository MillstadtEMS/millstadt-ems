export type Call911Step = {
  title: string;
  shortTitle: string;
  body: string;
  say?: string;
};

export const CALL_911_STEPS: Call911Step[] = [
  {
    shortTitle: "Notice",
    title: "Recognize an emergency",
    body: "A fire, serious injury, immediate danger, or a person who will not wake up can be an emergency.",
  },
  {
    shortTitle: "Adult",
    title: "Get a trusted adult when possible",
    body: "Tell a parent, teacher, caregiver, or another trusted adult right away. If no trusted adult can help, call 911 yourself.",
  },
  {
    shortTitle: "Call",
    title: "Call 911",
    body: "Use a real phone only during a real emergency. For practice, use a toy phone or paper keypad.",
  },
  {
    shortTitle: "Where",
    title: "Say where you are",
    body: "Give the address, nearby street, building name, or another landmark. The dispatcher can ask questions to help find you.",
    say: "I am at...",
  },
  {
    shortTitle: "What",
    title: "Explain what happened",
    body: "Use short, clear words. Tell the dispatcher who needs help and what you can see or hear.",
    say: "We need help because...",
  },
  {
    shortTitle: "Listen",
    title: "Answer and listen",
    body: "Stay on the line, answer the dispatcher's questions, and follow the safety directions you are given.",
  },
  {
    shortTitle: "Safe",
    title: "Stay safe while help comes",
    body: "Move away from traffic, fire, smoke, weapons, or other danger. Do not touch medicine or medical equipment.",
  },
  {
    shortTitle: "Help",
    title: "Responders arrive",
    body: "Police, fire, or EMS may arrive depending on the emergency. Stay with a trusted adult and give responders room to work.",
  },
];
