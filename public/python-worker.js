/* Browser-only Python execution for Syntax Studio. */
let pyodideInstance = null;

async function initialisePython() {
  if (pyodideInstance) return pyodideInstance;
  importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js");
  pyodideInstance = await loadPyodide({
    stdout: (text) => self.postMessage({ type: "output", text }),
    stderr: (text) => self.postMessage({ type: "output", text: "[stderr] " + text })
  });
  return pyodideInstance;
}

initialisePython()
  .then(() => self.postMessage({ type: "ready" }))
  .catch((error) => self.postMessage({ type: "error", text: "Could not load Python: " + error.message }));

self.onmessage = async (event) => {
  if (event.data?.type !== "run") return;
  try {
    const runtime = await initialisePython();
    await runtime.runPythonAsync(String(event.data.code ?? ""));
    self.postMessage({ type: "done" });
  } catch (error) {
    self.postMessage({ type: "error", text: String(error) });
  }
};
