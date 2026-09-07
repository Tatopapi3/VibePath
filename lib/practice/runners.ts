// Client-side code execution for the Practice playground.
//
// JavaScript runs inside a Web Worker built from a Blob URL: no DOM, no
// network, and killable via terminate() so a beginner's `while (true)`
// can't lock the tab. Python runs through Pyodide, loaded lazily from the
// jsDelivr CDN the first time a Python challenge is executed.

export interface RunResult {
  stdout: string[];
  error: string | null;
  durationMs: number;
  /** Return value of the entry function per graded call, in order. */
  calls: { input: string; output: string | null; error: string | null }[];
}

const JS_TIMEOUT_MS = 4000;

const WORKER_SRC = `
self.onmessage = (e) => {
  const { code, entry, inputs } = e.data;
  const stdout = [];
  const fmt = (args) => args.map((x) => {
    if (typeof x === "string") return x;
    try { return JSON.stringify(x); } catch { return String(x); }
  }).join(" ");
  const sandboxConsole = {
    log:  (...a) => stdout.push(fmt(a)),
    info: (...a) => stdout.push(fmt(a)),
    warn: (...a) => stdout.push(fmt(a)),
    error:(...a) => stdout.push(fmt(a)),
    debug:(...a) => stdout.push(fmt(a)),
  };
  let error = null;
  const calls = [];
  try {
    // Allow "export function foo" / "export const foo" style starter code.
    const src = String(code).replace(
      /^[ \\t]*export[ \\t]+(?=(default[ \\t]+)?(function|const|let|var|class)\\b)/gm,
      ""
    );
    const factory = new Function(
      "console",
      src + "\\n;return (typeof " + (entry || "solution") +
        " === 'function') ? " + (entry || "solution") + " : undefined;"
    );
    const entryFn = factory(sandboxConsole);
    if (Array.isArray(inputs) && inputs.length && typeof entryFn === "function") {
      for (const input of inputs) {
        try {
          const args = (0, eval)("[" + input + "]");
          const out = entryFn.apply(null, args);
          calls.push({
            input,
            output: out === undefined ? "undefined"
              : typeof out === "string" ? out
              : (() => { try { return JSON.stringify(out); } catch { return String(out); } })(),
            error: null,
          });
        } catch (err) {
          calls.push({ input, output: null, error: (err && err.message) || String(err) });
        }
      }
    }
  } catch (err) {
    error = (err && err.stack) ? String(err.stack) : String(err);
  }
  self.postMessage({ stdout, error, calls });
};
`;

export function runJavaScript(
  code: string,
  opts: { entry?: string; inputs?: string[] } = {}
): Promise<RunResult> {
  const started = performance.now();
  return new Promise((resolve) => {
    let worker: Worker;
    let url: string;
    try {
      url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
      worker = new Worker(url);
    } catch (err) {
      resolve({
        stdout: [],
        error: `Couldn't start the JavaScript runtime: ${String(err)}`,
        durationMs: 0,
        calls: [],
      });
      return;
    }

    const finish = (r: Omit<RunResult, "durationMs">) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({ ...r, durationMs: Math.round(performance.now() - started) });
    };

    const timer = setTimeout(() => {
      finish({
        stdout: [],
        error: `Timed out after ${JS_TIMEOUT_MS / 1000}s — check for an infinite loop.`,
        calls: [],
      });
    }, JS_TIMEOUT_MS);

    worker.onmessage = (e: MessageEvent) => finish(e.data);
    worker.onerror = (e) => finish({ stdout: [], error: e.message || "Worker error", calls: [] });
    worker.postMessage({ code, entry: opts.entry, inputs: opts.inputs ?? [] });
  });
}

// ── Python (Pyodide) ──────────────────────────────────────────────────

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

interface PyodideAPI {
  setStdout: (o: { batched: (s: string) => void }) => void;
  setStderr: (o: { batched: (s: string) => void }) => void;
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: { get: (k: string) => unknown };
}

declare global {
  interface Window {
    loadPyodide?: (o: { indexURL: string }) => Promise<PyodideAPI>;
  }
}

let pyodidePromise: Promise<PyodideAPI> | null = null;

function loadPyodideOnce(): Promise<PyodideAPI> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = new Promise<PyodideAPI>((resolve, reject) => {
    if (window.loadPyodide) {
      window.loadPyodide({ indexURL: PYODIDE_BASE }).then(resolve, reject);
      return;
    }
    const script = document.createElement("script");
    script.src = `${PYODIDE_BASE}pyodide.js`;
    script.onload = () => {
      if (!window.loadPyodide) return reject(new Error("Pyodide failed to load"));
      window.loadPyodide({ indexURL: PYODIDE_BASE }).then(resolve, reject);
    };
    script.onerror = () => reject(new Error("Couldn't download the Python runtime"));
    document.head.appendChild(script);
  }).catch((err) => {
    pyodidePromise = null; // allow a retry
    throw err;
  });
  return pyodidePromise;
}

export function pythonRuntimeReady(): boolean {
  return pyodidePromise != null;
}

export async function runPython(
  code: string,
  opts: { entry?: string; inputs?: string[] } = {}
): Promise<RunResult> {
  const started = performance.now();
  const stdout: string[] = [];
  let error: string | null = null;
  const calls: RunResult["calls"] = [];

  let py: PyodideAPI;
  try {
    py = await loadPyodideOnce();
  } catch (err) {
    return {
      stdout: [],
      error: err instanceof Error ? err.message : String(err),
      durationMs: Math.round(performance.now() - started),
      calls: [],
    };
  }

  py.setStdout({ batched: (s) => stdout.push(s) });
  py.setStderr({ batched: (s) => stdout.push(s) });

  try {
    await py.runPythonAsync(code);
    const entry = opts.entry || "solution";
    if (opts.inputs?.length) {
      for (const input of opts.inputs) {
        try {
          const out = await py.runPythonAsync(`str(${entry}(${input}))`);
          calls.push({ input, output: typeof out === "string" ? out : String(out), error: null });
        } catch (err) {
          calls.push({ input, output: null, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return { stdout, error, durationMs: Math.round(performance.now() - started), calls };
}
