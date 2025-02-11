import { getRequestContext } from "./request.js";
import { serializeJsonWithBlobs } from "./serialize.js";

let _options;
export function configureFreestyle(options) {
  _options = options;
}

export function cloudstate(target, ..._args) {
  return target;
}

export function useCloud(id, _reserved, options) {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        const fn = (...args) => {
          const base =
            options?.baseUrl ||
            _options?.baseUrl ||
            (typeof location !== "undefined" && location?.origin) ||
            (typeof Deno !== "undefined" &&
              Deno?.env?.get("DEFAULT_CLOUDSTATE_URL")) ||
            "http://localhost:8910";

          return new CloudstatePromise(() => {
            return Promise.all([
              serializeJsonWithBlobs({ params: args }),
              (async () => {
                const headers = await (options?.createHeaders?.() ||
                  _options?.createHeaders?.());
                return headers;
              })(),
            ]).then(([body, headers]) => {
              const _headers = new Headers(headers);
              _headers.set("Content-Type", "application/json");
              const internalFetch = options?.fetch ?? _options?.fetch ?? fetch;
              return internalFetch(
                `${base}/cloudstate/instances/${id}/${String(prop)}`,
                {
                  method: "POST",
                  body,
                  headers: _headers,
                }
              )
                .then(async (response) => {
                  const text = await response.text().catch(() => "");
                  let json;
                  try {
                    json = JSON.parse(text);
                  } catch (e) {
                    return Promise.reject(
                      "Cloudstate Error: Could not parse response: " +
                        (text || "[Empty Response]")
                    );
                  }
                  return json;
                })
                .then((_json) => {
                  const json = _json;
                  if (json.error) {
                    const error = new Error(
                      json.error.stack?.replace("Error: ", "") ??
                        json.error.message
                    );
                    error.stack = undefined;
                    return Promise.reject(error);
                  } else {
                    return {
                      result: json.result,
                      invalidatedMethods: json.invalidatedMethods,
                    };
                  }
                });
            });
          });
        };
        fn.toJSON = () => ({ instance: id, method: prop });

        return fn;
      },
    }
  );
}

class CloudstatePromise extends Promise {
  constructor(executor) {
    super(() => {});
    this.executor = executor;
  }

  catch(onrejected) {
    this.onrejected = onrejected;
    return this;
  }

  then(onfulfilled, onrejected) {
    return this.executor()
      .then((res) => {
        return (
          onfulfilled?.(res.result, {
            invalidatedMethods: res.invalidatedMethods ?? [],
          }) ?? res.result
        );
      })
      .catch((err) => {
        if (this.onrejected) {
          return onfulfilled?.(
            this.onrejected(err, {
              invalidatedMethods: err.invalidatedMethods ?? [],
            }),
            {
              invalidatedMethods: err.invalidatedMethods ?? [],
            }
          );
        }

        if (onrejected) {
          onfulfilled?.(
            onrejected?.(err, {
              invalidatedMethods: err.invalidatedMethods ?? [],
            }),
            {
              invalidatedMethods: err.invalidatedMethods ?? [],
            }
          );
        }

        return Promise.reject(err);
      });
  }
}

export function useRequest() {
  const requestContext = getRequestContext();
  if (!requestContext) {
    throw new Error("useRequest() cannot be used in a browser environment");
  }
  const store = requestContext.getStore();
  if (!store) {
    throw new Error("No request found");
  }
  return store.request;
}

export function invalidate(method) {
  const requestContext = getRequestContext();
  if (!requestContext) {
    throw new Error("invalidate() cannot be used in a browser environment");
  }
  const store = requestContext.getStore();
  if (!store) {
    throw new Error("No request found");
  }
  store.env.invalidateMethod(method);
}

export function useLocal(target) {
  const id = typeof target === "string" ? target : target.id;
  return getRoot(id) || getCloudstate(id);
}

export function defineConfig(config) {
  return config;
}
