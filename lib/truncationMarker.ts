// /api/generate detects mid-stream that the model hit max_tokens (the
// response got cut off before the HTML was complete) only after bytes have
// already started flowing to the client — by then it's too late to change
// the HTTP status or attach a message to a stream-level error; the client
// just sees a generic "network error" with no detail (verified: a custom
// Error passed to a ReadableStream controller's error() after headers are
// sent does not survive the trip — see route.ts for how this is used).
//
// So instead of erroring the HTTP stream, the route appends this marker as
// the last bytes of an otherwise-normal 200 response, and the client checks
// for it once the stream completes, turning it into a clear, actionable
// error itself. Distinctive enough that real generated code won't produce
// it by coincidence.
export const TRUNCATION_MARKER = "\n<!--__VIBEPATH_TRUNCATED__-->";
