// deno-lint-ignore-file no-explicit-any
import { nanoquery } from "npm:@nanostores/query";
import { derived } from "npm:svelte/store";

const [createFetcherStore, createMutatorStore, { revalidateKeys }] =
  nanoquery();

let ws;

export function createCloudQuery(queryFn) {
  if (typeof document !== "undefined" && !ws) {
    ws = new WebSocket(
      `${window.location.toString().includes("https") ? "wss" : "ws"}://${
        window.location.host
      }/cloudstate`
    );

    ws.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      if (data.instance && data.method) {
        revalidateKeys(data.instance + data.method);
      }
    });
  }

  const keys = [];
  if (queryFn.toJSON) {
    const json = queryFn.toJSON();
    keys.push(json.instance, json.method);
  }

  const store = createFetcherStore(keys, {
    fetcher: async () => {
      const res = await queryFn();
      return res;
    },
  });

  return {
    data: derived(store, ($store) => $store.data),
    error: derived(store, ($store) => $store.error),
    loading: derived(store, ($store) => $store.loading),
    promise: derived(store, ($store) => $store.promise),
    revalidate: (...args) => store.revalidate(args),
  };
}

export function createCloudMutation(mutationFn) {
  const store = createMutatorStore(
    async ({ data }) => {
      return await mutationFn(...data).then((res, context) => {
        // if the websocket is open then we can expect it to handle the invalidations
        if (!ws || (ws && ws.readyState !== ws.OPEN)) {
          context.invalidatedMethods.forEach((method) => {
            revalidateKeys(method.instance + method.method);
          });
        }
        return res;
      });
    },
    {
      throttleCalls: false,
    }
  );

  return {
    loading: derived(store, ($store) => $store.loading),
    error: derived(store, ($store) => $store.error),
    // promise: derived(store, ($store) => $store.promise),
    mutate: (...args) => store.mutate(args),
  };
}
