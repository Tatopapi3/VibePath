import type { ChallengeContent } from "@/lib/content/types";
import { runJavaScript, runPython, type RunResult } from "@/lib/practice/runners";

export type PracticeLang = "javascript" | "python";

/** Which challenge languages the playground can actually execute. */
export function isRunnable(content: ChallengeContent): content is ChallengeContent & { language: PracticeLang } {
  return content.language === "javascript" || content.language === "python";
}

/** Grab the entry function name from starter code (prefers one called `solution`). */
export function detectEntry(starterCode: string): string | null {
  const names: string[] = [];
  const re = /(?:function|def)\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(starterCode))) names.push(m[1]);
  if (names.includes("solution")) return "solution";
  return names[0] ?? null;
}

export interface GradedCase {
  description: string;
  input: string;
  expected: string;
  actual: string | null;
  passed: boolean;
  error: string | null;
}

/**
 * Test cases are only auto-gradable when they carry a concrete `input` to
 * pass to the entry function. Many seeded challenges only have a prose
 * `expected` ("95 returns A") with no input — those fall back to run-only.
 */
export function gradableCases(content: ChallengeContent) {
  return (content.testCases ?? []).filter(
    (tc) => typeof tc.input === "string" && tc.input.trim() !== "" && typeof tc.expected === "string"
  );
}

export function canAutoGrade(content: ChallengeContent): boolean {
  return isRunnable(content) && !!detectEntry(content.starterCode) && gradableCases(content).length > 0;
}

export function run(language: PracticeLang, code: string, opts?: { entry?: string; inputs?: string[] }): Promise<RunResult> {
  return language === "python" ? runPython(code, opts) : runJavaScript(code, opts);
}

export async function grade(content: ChallengeContent & { language: PracticeLang }, code: string) {
  const entry = detectEntry(content.starterCode) ?? "solution";
  const cases = gradableCases(content);
  const result = await run(content.language, code, { entry, inputs: cases.map((c) => c.input as string) });

  const graded: GradedCase[] = cases.map((tc, i) => {
    const call = result.calls[i];
    const expected = (tc.expected ?? "").trim();
    const actual = call?.output?.trim() ?? null;
    return {
      description: tc.description || `Case ${i + 1}`,
      input: tc.input as string,
      expected,
      actual,
      passed: call != null && call.error == null && actual === expected,
      error: call?.error ?? null,
    };
  });

  return { result, graded, allPassed: graded.length > 0 && graded.every((g) => g.passed) };
}
