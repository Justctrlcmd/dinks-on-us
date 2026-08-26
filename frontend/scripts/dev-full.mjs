import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendDirectory = resolve(frontendDirectory, "../backend");
const processes = [];
let stopping = false;

function start(command, args, cwd, label) {
  const child = spawn(command, args, { cwd, stdio: "inherit", env: process.env });
  processes.push(child);
  child.on("error", (error) => {
    console.error(`${label} could not start: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(`${label} stopped${signal ? ` from ${signal}` : ` with code ${code ?? 1}`}.`);
      stop(code ?? 1);
    }
  });
  return child;
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 250);
}

start("php", ["artisan", "serve", "--host=127.0.0.1", "--port=8000"], backendDirectory, "Laravel API");
start(process.execPath, [resolve(frontendDirectory, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port=3000"], frontendDirectory, "Next.js frontend");

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
