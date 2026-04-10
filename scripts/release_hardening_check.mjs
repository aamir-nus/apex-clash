import { spawn } from "node:child_process";

const rootDir = process.cwd();

function runStep(label, command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env
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
        resolve({ label, stdout, stderr });
        return;
      }

      reject(
        new Error(
          JSON.stringify(
            {
              label,
              code,
              stdout,
              stderr
            },
            null,
            2
          )
        )
      );
    });
  });
}

async function run() {
  const steps = [
    { label: "smoke", command: "npm", args: ["run", "test:smoke"] },
    { label: "docker-browser-flow", command: "npm", args: ["run", "test:docker-browser-flow"] },
    { label: "docker-deploy", command: "npm", args: ["run", "test:docker-deploy"] }
  ];
  const results = [];

  try {
    for (const step of steps) {
      const result = await runStep(step.label, step.command, step.args);
      results.push({
        label: step.label,
        ok: true
      });
      process.stdout.write(result.stdout);
      if (result.stderr) {
        process.stderr.write(result.stderr);
      }
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          status: "passed",
          steps: results
        },
        null,
        2
      )}\n`
    );
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify(
        {
          status: "failed",
          completedSteps: results,
          error: error.message
        },
        null,
        2
      )}\n`
    );
    process.exitCode = 1;
  }
}

await run();
