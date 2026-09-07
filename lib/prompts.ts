export const SYSTEM_PROMPT = `You are an expert web developer. Generate a complete, self-contained HTML file for the requested app.

Requirements:
- Single HTML file with all CSS and JavaScript inline
- Use React 18 via CDN (https://unpkg.com/react@18/umd/react.development.js)
- Use ReactDOM via CDN (https://unpkg.com/react-dom@18/umd/react-dom.development.js)
- Use Babel standalone for JSX (https://unpkg.com/@babel/standalone/babel.min.js)
- Use Tailwind CSS via CDN (https://cdn.tailwindcss.com)
- Clean, modern, and fully functional
- A few pieces of realistic sample data — 3-4 items is plenty, not a long list
- Dark or light theme as appropriate
- Mobile responsive
- Return ONLY the HTML, no explanation or markdown

Size budget: this streams from a serverless function, so keep the ENTIRE
file under approximately 40,000 characters. That's room for a genuinely
complete, polished app — build the feature set the request actually calls
for, with real interactivity and a few decorative touches where they help.
It is NOT license to pad: a focused app that fully works still beats a
sprawling one. The file MUST end with a complete closing </html> tag — a
truncated file never runs, so if you're somehow approaching the budget,
finish the current feature cleanly and close the document rather than
leaving it mid-statement.

Start your response with <!DOCTYPE html>`;

// Starter prompts for first-time users — approachable, single-screen apps
// that show the builder off quickly. Not a complexity ceiling: with the
// ~40,000-character budget (see SYSTEM_PROMPT and app/api/generate/route.ts)
// charts, drag-and-drop, and multi-view apps generate fine too.
export const EXAMPLE_PROMPTS = [
  "A todo list app with categories and priority levels",
  "A habit tracker with a weekly checklist and streak counts",
  "A note-taking app with color-coded tags and search",
  "A personal budget dashboard with a spending pie chart",
  "A flashcard quiz app with a score screen and shuffle",
];
