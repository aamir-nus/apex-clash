import { spawn } from "node:child_process";

const rootDir = process.cwd();

function runCommand(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["compose", ...args], {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || stdout || `docker compose ${args.join(" ")} failed with code ${code}`));
    });
  });
}

function runBrowserFlow() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["scripts/browser_flow_check.mjs"], {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        BROWSER_FLOW_MODE: "external",
        BROWSER_FLOW_API_BASE_URL: "http://localhost:4000",
        BROWSER_FLOW_WEB_URL: "http://localhost:8080"
      }
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || stdout || `browser flow failed with code ${code}`));
    });
  });
}

async function run() {
  let composeLogs = "";

  try {
    const up = await runCommand(["up", "-d", "--build"]);
    composeLogs += up.stdout + up.stderr;

    const browserFlow = await runBrowserFlow();
    process.stdout.write(browserFlow.stdout);
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify(
        {
          status: "failed",
          error: error.message,
          composeLogs
        },
        null,
        2
      )}\n`
    );
    process.exitCode = 1;
  } finally {
    await runCommand(["down"]).catch(() => {});
  }
}

await run();
