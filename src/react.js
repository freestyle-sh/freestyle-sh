import { nanoquery } from "@nanostores/query";
import { useStore } from "@nanostores/react";
import { useState } from "react";

const [createFetcherStore, createMutatorStore, { revalidateKeys }] =
  nanoquery();

let ws = undefined;

export function useCloudQuery(queryFn) {
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
  // @ts-ignore: hidden method
  if (queryFn.toJSON) {
    // @ts-ignore: hidden method
    const json = queryFn.toJSON();
    // @ts-ignore: hidden method
    keys.push(json.instance, json.method);
  }

  const $store = createFetcherStore(keys, {
    fetcher: async () => {
      const res = await queryFn();
      return res;
    },
  });

  const [state] = useState($store);
  const store = useStore(state);
  return {
    ...store,
    mutate: state.mutate,
  };
}

export function useCloudMutation(mutationFn) {
  const $store = createMutatorStore(
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

  const [state] = useState($store);
  const store = useStore(state);

  return {
    ...store,
    mutate: (...args) => store.mutate(args),
  };
}
