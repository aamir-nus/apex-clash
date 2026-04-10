import test from "node:test";
import assert from "node:assert/strict";
import {
  getCurrentSession,
  loginUserSession,
  registerUserSession
} from "../src/controllers/authController.js";
import { getPlayerProfile } from "../src/controllers/playerController.js";
import { createSaveSlot, listSaveSlots } from "../src/controllers/saveController.js";

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

test("auth-owned save slots are isolated from guest slot listings", async () => {
  const registerResponse = createMockResponse();
  await registerUserSession(
    {
      id: "req-auth-register",
      body: { username: "isolateduser", password: "secret12" }
    },
    registerResponse
  );
  assert.equal(registerResponse.statusCode, 201);

  const loginResponse = createMockResponse();
  await loginUserSession(
    {
      id: "req-auth-login",
      body: { username: "isolateduser", password: "secret12" }
    },
    loginResponse
  );
  assert.equal(loginResponse.statusCode, 200);

  const authUser = loginResponse.payload.data.user;

  const profileResponse = createMockResponse();
  await getPlayerProfile({ authUser }, profileResponse);
  assert.equal(profileResponse.statusCode, 200);

  const preListResponse = createMockResponse();
  await listSaveSlots({ authUser }, preListResponse);
  assert.equal(preListResponse.payload.data.length, 0);

  const createSaveResponse = createMockResponse();
  await createSaveSlot(
    {
      id: "req-auth-save-create",
      authUser,
      body: { label: "Private Slot", archetypeId: "striker" }
    },
    createSaveResponse
  );
  assert.equal(createSaveResponse.statusCode, 201);

  const authListResponse = createMockResponse();
  await listSaveSlots({ authUser }, authListResponse);
  assert.equal(authListResponse.payload.data.length, 1);
  assert.equal(authListResponse.payload.data[0].label, "Private Slot");

  const guestListResponse = createMockResponse();
  await listSaveSlots({ authUser: null }, guestListResponse);
  assert.equal(
    guestListResponse.payload.data.some((slot) => slot.label === "Private Slot"),
    false
  );

  const meResponse = createMockResponse();
  await getCurrentSession(
    {
      headers: {
        authorization: `Bearer ${loginResponse.payload.data.token}`
      }
    },
    meResponse
  );
  assert.equal(meResponse.statusCode, 200);
  assert.equal(meResponse.payload.data.user.username, "isolateduser");
});
