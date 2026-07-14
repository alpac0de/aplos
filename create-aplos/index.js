#!/usr/bin/env node

// `npm create aplos` / `bun create aplos` entry point.
//
// The scaffolding logic itself lives in the framework (src/command/create.js) and
// is shared with `aplos create`. This file used to carry its own copy, which is how
// the two drifted: the templates here still pinned aplosjs@^0.14.0 and ignored
// public/dist, long after the framework moved to dist/ and to a derived pin.
import create from "aplosjs/create";

const projectName = process.argv[2];

if (!projectName) {
  console.error("Usage: create-aplos <project-name>");
  console.error("       bun create aplos <project-name>");
  console.error("       npm create aplos <project-name>");
  process.exit(1);
}

await create(projectName);
