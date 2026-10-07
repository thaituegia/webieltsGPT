import { spawn } from "node:child_process";
import { resolve } from "node:path";
const children = [
  spawn(process.execPath, ["--watch", "server/index.js"], { stdio: "inherit" }),
  spawn(
    process.execPath,
    [resolve("node_modules/vite/bin/vite.js"), "--host", "0.0.0.0"],
    { stdio: "inherit" },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => {
    if (child.exitCode === null) child.kill("SIGTERM");
  });
  setTimeout(() => process.exit(code), 300).unref();
}
children.forEach((child) => {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
});
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
