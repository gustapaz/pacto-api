import { spawnSync } from "node:child_process";
const r = spawnSync(
  process.execPath,
  ["node_modules/rescript/rescript", "build"],
  { stdio: "inherit" },
);
if (r.error) throw r.error;
if (r.status !== 0) process.exit(r.status ?? 1);
console.log("ReScript contract engine compiled to ES modules.");
