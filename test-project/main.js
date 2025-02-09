import express from "express";
import { useCloud } from "freestyle-sh";

// const __fetch = fetch;
// globalThis.fetch = function (url, params) {
//   // if (typeof url === "string" && new URL(url).hostname.endsWith(".localhost")) {
//   //   const originalHost = new URL(url).host;
//   //   const newUrl = url.replace(/:\/\/.*\.localhost/, "://localhost");
//   //   params = params || {};
//   //   params.headers = params.headers || {};
//   //   if (!params.headers["Host"]) {
//   //     params.headers["Host"] = originalHost;
//   //   }
//   //   return __fetch(newUrl, params);
//   // }

//   // return __fetch(url, params);

//   // if (process.env.FREESTYLE_CLOUDSTATE_URL_OVERRIDE) {
//   //   const newUrl = new URL(url);
//   //   newUrl.host = process.env.FREESTYLE_CLOUDSTATE_URL_OVERRIDE;
//   //   params = params || {};
//   //   params.headers = params.headers || {};
//   //   if (!params.headers["Host"]) {
//   //     params.headers["Host"] = url.host;
//   //   }
//   //   return __fetch(newUrl.toString(), params);
//   // }

//   if (
//     typeof url === "string" &&
//     url.startsWith(process.env.DEFAULT_CLOUDSTATE_URL) &&
//     process.env.DEFAULT_CLOUDSTATE_HOST
//   ) {
//     console.error("Overriding fetch");
//     params = params || {};
//     params.headers = params.headers || new Headers();
//     // if (params.headers.get("Host")) {
//     console.error(process.env.DEFAULT_CLOUDSTATE_HOST);
//     params.headers.set("Host", process.env.DEFAULT_CLOUDSTATE_HOST);
//     // }
//     __fetch(url, params);
//   }

//   return __fetch(url, params);
// };

const app = express();
const port = 3000;

app.get("/", async (req, res) => {
  const count = await useCloud("counter")
    .increment()
    .catch((err) => {
      console.error(err);
      res.send("Failed to increment");
    });
  res.send(`the count is ${count.value}`);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
