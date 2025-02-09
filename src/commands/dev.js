import cookie from "cookie";
import { buildServer } from "../cli-utils/cloudstate/build.js";
import { spawn } from "node:child_process";
import { createServer as createHttpServer } from "node:http";
import httpProxy from "http-proxy";
const createProxyServer = httpProxy.createProxyServer;
import { getFreestyleConfig } from "../utils.js";
import process from "node:process";
import { WebSocketServer } from "ws";
import child_process from "node:child_process";
import { createCommand } from "commander";
import fs from "node:fs/promises";
import chokidar from "chokidar";
import { getCloudstatePlatformBinName } from "../platform.js";

process.env.DEV = "true";

export const devCommand = createCommand("dev").action(devAction);

const serverURL = (config) => config.dev?.proxy || "http://localhost:4321";

async function devAction() {
  // TODO: should probably be reloaded on change
  const configuration = await getFreestyleConfig();
  const proxy = serverURL(configuration);

  const handleStream = (stream) => {
    stream.setEncoding("utf8");
    stream.on("data", (data) => {
      const replacedData = data.replaceAll(proxy, "http://localhost:8910");
      process.stdout.write(replacedData);
    });

    stream.on("error", (err) => {
      console.error(`Error: ${err.message}`);
    });
  };

  fs.readFile(process.cwd() + "/package.json")
    .then(() => {
      const command = configuration.dev?.command || "npm run dev";
      const [bin, ...args] = command.split(" ");
      const child = spawn(bin, args, {
        stdio: "pipe",
        env: { ...process.env, FORCE_COLOR: "true" },
      });
      handleStream(child.stdout);
      handleStream(child.stderr);
    })
    .catch(() => {
      console.error("No package.json found, skipping npm run dev");
    });

  const server = await startServer(configuration);
  let rebuilding = false;

  let ignoreList = [
    /node_modules/,
    /\.git/,
    /\.test\.(js|ts|tsx)$/,
    /\.freestyle/,
    /dist/,
    /_fresh/,
    /\.d\.ts$/,
    /\.astro$/,
  ];

  try {
    const freestyleIgnore = await fs.readFile(
      `${process.cwd()}/.freestyleignore`,
      "utf8"
    );
    const lines = freestyleIgnore
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    ignoreList.push(...lines);
  } catch {}

  const watcher = chokidar
    .watch("./", {
      ignored: ignoreList,
      persistent: true,
    })
    .on("all", async (event, path) => {
      if (rebuilding) return;
      try {
        console.log("rebuilding...");
        rebuilding = true;
        await server.reload();
      } finally {
        rebuilding = false;
      }
    });
}

async function startServer(configuration) {
  await buildServer();
  const connections = [];
  const serverUrl = serverURL(configuration);

  const proxy = createProxyServer({
    target: serverUrl,
    changeOrigin: true,
  });

  const cloudstateProxy = createProxyServer({
    target: "http://localhost:3000",
    changeOrigin: true,
  });

  console.log(`created proxy from http://localhost:8910 to ${serverUrl}`);

  const server = createHttpServer((req, res) =>
    handleRequest(req, res, proxy, configuration, cloudstateProxy, connections)
  );
  const wsServer = new WebSocketServer({
    noServer: true,
  });

  if (process.env.CLOUDSTATE_BIN) {
    child_process.spawn(
      process.env.CLOUDSTATE_BIN,
      ["serve", "./.freestyle/dist/cloudstate.js", "--watch", "--memory-only"],
      {
        stdio: "inherit",
      }
    );
  } else {
    child_process.spawn(
      "npx",
      [
        getCloudstatePlatformBinName(),
        "serve",
        "./.freestyle/dist/cloudstate.js",
        "--watch",
        "--memory-only",
      ],
      {
        stdio: "inherit",
      }
    );
  }

  server.on("upgrade", (req, socket, head) => {
    if (req.headers["sec-websocket-protocol"] === "vite-hmr") {
      proxy.ws(req, socket, head);
    } else {
      wsServer.handleUpgrade(req, socket, head, (ws) => {
        wsServer.emit("connection", ws, req);
        connections.push(ws);
      });
    }
  });

  cloudstateProxy.on("proxyReq", (proxyReq, req) => {
    proxyReq.setHeader("Content-Type", "application/json");
  });

  proxy.on("proxyRes", (proxyRes, req) => {
    let setCookieHeader = proxyRes.headers["set-cookie"] || [];
    if (!Array.isArray(setCookieHeader)) {
      setCookieHeader = [setCookieHeader];
    }
    const parsedCookies = cookie.parse(req.headers.cookie || "");
    const sessionId =
      parsedCookies["freestyle-session-id"] || crypto.randomUUID();
    setCookieHeader.push(
      `freestyle-session-id=${sessionId}; Path=/; HttpOnly; SameSite=Lax`
    );
    proxyRes.headers["set-cookie"] = setCookieHeader;
  });

  server.listen(8910, () => {
    // console.log(`Proxy server running on port 8910`);
  });

  return {
    reload: async () => {
      await buildServer();
    },
    close: () => server.close(),
  };
}

async function handleRequest(
  req,
  res,
  webProxy,
  configuration,
  cloudstateProxy,
  connections
) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/__invalidate__")) {
    const [_host, instance, method] = url.pathname.slice(1).split("/");
    connections.forEach((connection) => {
      connection.send(
        JSON.stringify({
          instance: instance,
          method: method,
        })
      );
    });
    res.end();
  } else if (url.pathname.startsWith("/cloudstate/")) {
    cloudstateProxy.web(req, res, {}, () => {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end(
        JSON.stringify({
          error: {
            message: `Could not connect to Cloudstate dev server.`,
          },
        })
      );
    });
  } else {
    webProxy.web(req, res, {}, () => {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end(
        `No Webserver running on port ${serverURL(
          configuration
        )} to respond to non-cloudstate requests.`
      );
    });
  }
}
