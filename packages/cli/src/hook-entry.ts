#!/usr/bin/env node
import { spawn } from "node:child_process";

const kaban = spawn("kaban", ["sync"], {
  stdio: ["pipe", "inherit", "inherit"],
});

process.stdin.pipe(kaban.stdin);

kaban.on("close", (code) => {
  process.exit(code ?? 0);
});

kaban.on("error", () => {
  process.exit(0);
});
