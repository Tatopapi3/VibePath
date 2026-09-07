import type { TourStep } from "./Tour";

export const BUILD_TOUR: TourStep[] = [
  {
    selector: '[data-tour="build-modes"]',
    title: "Two ways to start",
    body: "New here? “Just describe it” — type what you want in plain words. Know how to scope? “Build a PRD first” walks you through a proper spec, then builds to it.",
  },
  {
    selector: '[data-tour="examples"]',
    title: "Or start from an example",
    body: "Not sure what to build? Pick one of these and tweak it — a fast way to see what's possible.",
  },
  {
    selector: '[data-tour="tutor"]',
    title: "Your tutor is always here",
    body: "Once your app is built, open the tutor and ask “how does this code work?” — it can see the exact code in your preview and explain it line by line.",
  },
];

export const LEARN_TOUR: TourStep[] = [
  {
    selector: '[data-tour="section-switch"]',
    title: "Two kinds of learning",
    body: "“Foundations” teaches product thinking — how to spec and scope an app. “Languages” is the hands-on coding curriculum.",
  },
  {
    selector: '[data-tour="lang-tabs"]',
    title: "Pick a track",
    body: "Each language is a full path of lessons, quizzes, and coding challenges. Start with HTML/CSS/JavaScript if you're new.",
  },
  {
    selector: '[data-tour="curriculum"]',
    title: "Work through the units",
    body: "Open a unit to see its lessons. Your progress is saved automatically on this device.",
  },
  {
    selector: '[data-tour="tutor"]',
    title: "Stuck? Ask the tutor",
    body: "The tutor knows which lesson you're on and can re-explain a concept, give another example, or quiz you.",
  },
];
