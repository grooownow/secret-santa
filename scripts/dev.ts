import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { APP_PORT } from "../config/ports";

/**
 * `next dev --port N` does NOT auto-increment when N is taken — it fails
 * with EADDRINUSE (verified on Next 16.2.10; only the *default* port
 * auto-increments). So we find the first free port at or above APP_PORT
 * ourselves, then hand it to Next explicitly.
 */
function isFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    // Bind with NO host so we probe the dual-stack `::` address that
    // `next dev` itself binds. Probing `127.0.0.1` gives a false "free" when
    // the port is occupied on `::` (verified on Node 22/macOS), which would
    // hand Next a taken port and crash it with EADDRINUSE.
    srv.listen(port);
  });
}

async function firstFreePort(start: number, attempts = 10): Promise<number> {
  for (let port = start; port < start + attempts; port++) {
    if (await isFree(port)) return port;
  }
  throw new Error(
    `No free port in ${start}..${start + attempts - 1}. Free one and retry.`,
  );
}

async function main() {
  const port = await firstFreePort(APP_PORT);
  const child = spawn("next", ["dev", "--port", String(port)], {
    stdio: "inherit",
    shell: false,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  console.error("dev server failed to start:", error);
  process.exit(1);
});
