import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createGuestSession } from "../src/controllers/authController.js";
import { getContentBootstrap } from "../src/controllers/contentController.js";
import { createSaveSlot, getSaveSlot, updateSaveSlot } from "../src/controllers/saveController.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { requestLogger } from "../src/middleware/requestLogger.js";
import { getBootstrapContent } from "../src/services/contentService.js";

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

test("content service returns bootstrap payload", () => {
  const payload = getBootstrapContent();

  assert.equal(Array.isArray(payload.classes), true);
  assert.equal(Array.isArray(payload.enemies), true);
  assert.equal(Array.isArray(payload.skills), true);
  assert.equal(payload.classes.length > 0, true);
});

test("content controller returns bootstrap response", () => {
  const response = createMockResponse();

  getContentBootstrap({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.ok, true);
  assert.equal(Array.isArray(response.payload.data.items), true);
});

test("auth controller creates guest session", () => {
  const response = createMockResponse();

  createGuestSession({}, response);

  assert.equal(response.statusCode, 201);
  assert.equal(response.payload.ok, true);
  assert.equal(response.payload.data.mode, "guest");
});

test("save controller stores progression-oriented player state", () => {
  const createResponse = createMockResponse();

  createSaveSlot(
    {
      body: {
        archetypeId: "mid_range",
        label: "Progression Slot"
      }
    },
    createResponse
  );

  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.payload.data.playerState.level, 1);

  const updateResponse = createMockResponse();
  updateSaveSlot(
    {
      params: { slotId: createResponse.payload.data.id },
      body: {
        playerState: {
          level: 3,
          xp: 12,
          pendingStatPoints: 2
        },
        sessionSummary: {
          enemiesRemaining: 1
        }
      }
    },
    updateResponse
  );

  assert.equal(updateResponse.statusCode, 200);
  assert.equal(updateResponse.payload.data.playerState.level, 3);
  assert.equal(updateResponse.payload.data.sessionSummary.enemiesRemaining, 1);

  const getResponse = createMockResponse();
  getSaveSlot({ params: { slotId: createResponse.payload.data.id } }, getResponse);
  assert.equal(getResponse.statusCode, 200);
  assert.equal(getResponse.payload.data.playerState.pendingStatPoints, 2);
  assert.equal("stats" in getResponse.payload.data, false);
});

test("request logger emits start and completion records with request id", () => {
  const output = [];
  const originalLog = console.log;
  console.log = (line) => output.push(line);

  try {
    const request = {
      method: "GET",
      originalUrl: "/health"
    };
    const response = new EventEmitter();
    response.statusCode = 200;

    requestLogger(request, response, () => {});
    response.emit("finish");

    assert.equal(output.length, 2);
    assert.match(output[0], /HTTP request started/);
    assert.match(output[0], /"requestId":"req-/);
    assert.match(output[1], /HTTP request completed/);
    assert.match(output[1], /"statusCode":200/);
  } finally {
    console.log = originalLog;
  }
});

test("error handler logs request context", () => {
  const output = [];
  const originalError = console.error;
  console.error = (line) => output.push(line);

  try {
    const response = createMockResponse();
    errorHandler(
      new Error("boom"),
      {
        id: "req-test",
        method: "PUT",
        originalUrl: "/save/slot-1"
      },
      response
    );

    assert.equal(response.statusCode, 500);
    assert.equal(response.payload.ok, false);
    assert.match(output[0], /Unhandled request error/);
    assert.match(output[0], /"requestId":"req-test"/);
  } finally {
    console.error = originalError;
  }
});
