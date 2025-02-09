/**
 * Used to allow developers to access the request's context in their functions via `useRequest()`.
 */
export function getRequestContext() {
  if (typeof location !== "undefined") {
    throw new Error("getRequestContext() cannot be called in the browser.");
  }

  return globalThis.requestContext;
}
