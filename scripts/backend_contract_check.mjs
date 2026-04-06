import { createGuestSession } from "../server/src/controllers/authController.js";
import { getContentBootstrap } from "../server/src/controllers/contentController.js";
import {
  createSaveSlot,
  getSaveSlot,
  listSaveSlots,
  updateSaveSlot
} from "../server/src/controllers/saveController.js";

function createMockResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

async function runRequest(label, handler, request) {
  const response = createMockResponse();
  await handler(request, response);
  return {
    label,
    statusCode: response.statusCode,
    payload: response.payload
  };
}

const capturedLogs = [];
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => capturedLogs.push(args.join(" "));
console.warn = (...args) => capturedLogs.push(args.join(" "));
console.error = (...args) => capturedLogs.push(args.join(" "));

const requests = [
  await runRequest("POST /auth/guest", createGuestSession, { id: "req-guest" }),
  await runRequest("GET /content/bootstrap", getContentBootstrap, { id: "req-bootstrap" }),
  await runRequest("GET /save-slots", listSaveSlots, { id: "req-slots" }),
  await runRequest("POST /save-slots invalid", createSaveSlot, {
    id: "req-invalid-slot",
    body: { archetypeId: "bad_type", label: "Broken" }
  }),
  await runRequest("POST /save-slots valid", createSaveSlot, {
    id: "req-create-slot",
    body: { archetypeId: "long_range", label: "Backend Contract" }
  })
];

const createdSlotId = requests[4].payload?.data?.id;

requests.push(
  await runRequest("PUT /save/:slotId", updateSaveSlot, {
    id: "req-update-slot",
    params: { slotId: createdSlotId },
    body: {
      playerState: {
        level: 4,
        xp: 18,
        pendingStatPoints: 3
      },
      sessionSummary: {
        enemiesRemaining: 0
      }
    }
  })
);

requests.push(
  await runRequest("GET /save/:slotId", getSaveSlot, {
    id: "req-get-slot",
    params: { slotId: createdSlotId }
  })
);

requests.push(
  await runRequest("PUT /save/missing", updateSaveSlot, {
    id: "req-missing-slot",
    params: { slotId: "slot-999" },
    body: {}
  })
);

console.log = originalLog;
console.warn = originalWarn;
console.error = originalError;

const analysis = requests.map((entry) => {
  let expectation = "OK";

  if (entry.label === "POST /save-slots invalid") {
    expectation = entry.statusCode === 400 ? "OK" : "BUG";
  }

  if (entry.label === "POST /save-slots valid") {
    expectation =
      entry.payload?.data?.playerState?.ce === 96 &&
      entry.payload?.data?.playerState?.attack === 11
        ? "OK"
        : "BUG";
  }

  if (entry.label === "GET /save/:slotId") {
    expectation =
      entry.payload?.data?.playerState?.level === 4 &&
      !("stats" in entry.payload.data)
        ? "OK"
        : "BUG";
  }

  return {
    ...entry,
    expectation
  };
});

process.stdout.write(
  JSON.stringify(
    {
      analysis,
      logs: capturedLogs
    },
    null,
    2
  )
);
