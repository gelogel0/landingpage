// Diagnostic: minimal serverless function with zero dependencies and zero
// branching. If this also returns FUNCTION_INVOCATION_FAILED, the entire
// serverless layer is misconfigured (build/runtime/Node version) — not our
// handler logic. Delete after diagnosis.
export default function handler(
  _req: { method?: string },
  res: {
    status: (code: number) => { json: (body: unknown) => void };
  }
): void {
  res.status(200).json({ ok: true, where: 'health', ts: Date.now() });
}
