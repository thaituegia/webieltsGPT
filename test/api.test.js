import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../server/db.js";
import { createApp } from "../server/app.js";
import { lessons, diagnosticItems } from "../server/content.js";
import { assessmentPrompt, prompts } from "../server/prompts.js";
let db, server, url, cookieA, cookieB, idA, idB;
before(async () => {
  db = openDatabase(":memory:");
  server = createApp(db, { staticDir: "/tmp/no-static" }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((r) => server.once("listening", r));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  db.close();
});
async function request(path, { method = "GET", body, cookie, origin } = {}) {
  const res = await fetch(url + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return {
    status: res.status,
    data,
    cookie: res.headers.get("set-cookie")?.split(";")[0],
  };
}
test("health available; application data requires authentication", async () => {
  assert.equal((await request("/health")).data.ok, true);
  assert.equal((await request("/lessons")).status, 401);
});
test("two users, unique credentials, hashed passwords, bounded registration", async () => {
  const a = await request("/auth/register", {
    method: "POST",
    body: {
      name: "An Nguyen",
      email: "an@example.com",
      password: "test-password-A",
    },
  });
  assert.equal(a.status, 201);
  cookieA = a.cookie;
  idA = a.data.id;
  const b = await request("/auth/register", {
    method: "POST",
    body: {
      name: "Binh Nguyen",
      email: "binh@example.com",
      password: "test-password-B",
    },
  });
  assert.equal(b.status, 201);
  cookieB = b.cookie;
  idB = b.data.id;
  assert.equal(
    (
      await request("/auth/register", {
        method: "POST",
        body: {
          name: "Third user",
          email: "third@example.com",
          password: "test-password-C",
        },
      })
    ).status,
    409,
  );
  assert.notEqual(
    db.prepare("SELECT password FROM users WHERE id=?").get(idA).password,
    "test-password-A",
  );
  assert.equal(
    (
      await request("/auth/login", {
        method: "POST",
        body: { email: "an@example.com", password: "wrong-password" },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/auth/login", {
        method: "POST",
        body: { email: "an@example.com", password: "test-password-A" },
      })
    ).status,
    200,
  );
});
test("no answer keys in lesson payload; rejects unanswered attempts and origin forgery", async () => {
  const ls = await request("/lessons", { cookie: cookieA });
  assert.equal(ls.status, 200);
  assert.ok(!("answer" in ls.data[0].questions[0]));
  assert.ok(!("evidence" in ls.data[0].questions[0]));
  assert.equal(
    (
      await request("/attempts", {
        method: "POST",
        cookie: cookieA,
        body: { lessonId: "r1", answers: {}, minutes: 1 },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/drafts/w1", {
        method: "PUT",
        cookie: cookieA,
        origin: "https://evil.example",
        body: { body: "forged" },
      })
    ).status,
    403,
  );
});
test("answer key scoring, repeated-item flag, error tracking and cross-user isolation", async () => {
  const l = lessons.find((l) => l.id === "r1"),
    answers = Object.fromEntries(l.questions.map((q) => [q.id, q.answer]));
  const a = await request("/attempts", {
    method: "POST",
    cookie: cookieA,
    body: { lessonId: l.id, answers, minutes: 15 },
  });
  assert.equal(a.status, 201);
  assert.equal(a.data.correct, 6);
  assert.equal(a.data.estimated_band, null);
  assert.equal(a.data.repeated, false);
  answers.r1q3 = "FALSE";
  const b = await request("/attempts", {
    method: "POST",
    cookie: cookieA,
    body: { lessonId: l.id, answers, minutes: 1 },
  });
  assert.equal(b.data.correct, 5);
  assert.equal(b.data.repeated, true);
  assert.ok(b.data.error_tags.includes("NOT_GIVEN_as_FALSE"));
  const dash = await request("/dashboard", { cookie: cookieA });
  assert.equal(dash.data.attempts.length, 2);
  assert.equal(dash.data.weeklyMinutes, 16);
  assert.equal(
    (await request("/dashboard", { cookie: cookieB })).data.attempts.length,
    0,
  );
});
test("drafts persist independently for each account and empty draft is supported", async () => {
  await request("/drafts/w1", {
    method: "PUT",
    cookie: cookieA,
    body: { body: "My private essay" },
  });
  assert.equal(
    (await request("/drafts/w1", { cookie: cookieA })).data.body,
    "My private essay",
  );
  assert.equal(
    (await request("/drafts/w1", { cookie: cookieB })).data.body,
    "",
  );
  await request("/drafts/w1", {
    method: "PUT",
    cookie: cookieA,
    body: { body: "" },
  });
  assert.equal(
    (await request("/drafts/w1", { cookie: cookieA })).data.body,
    "",
  );
});
test("spaced repetition schedules remember/forget and protects user data", async () => {
  const a = await request("/vocabulary/v1/review", {
    method: "POST",
    cookie: cookieA,
    body: { remembered: true },
  });
  assert.equal(a.data.interval, 1);
  const b = await request("/vocabulary/v1/review", {
    method: "POST",
    cookie: cookieA,
    body: { remembered: true },
  });
  assert.equal(b.data.interval, 2);
  const c = await request("/vocabulary/v1/review", {
    method: "POST",
    cookie: cookieA,
    body: { remembered: false },
  });
  assert.equal(c.data.interval, 0);
  assert.ok(Date.parse(c.data.due) > Date.now());
  assert.equal(
    (await request("/vocabulary", { cookie: cookieB })).data[0].review,
    null,
  );
});
test("36-question adaptive placement resumes, rejects foreign access and persists baseline", async () => {
  let state = (
    await request("/placement", { method: "POST", cookie: cookieA, body: {} })
  ).data;
  const resumed = (
    await request("/placement", { method: "POST", cookie: cookieA, body: {} })
  ).data;
  assert.equal(resumed.id, state.id);
  assert.ok(!("answer" in state.item));
  const foreign = await request(`/placement/${state.id}/answer`, {
    method: "POST",
    cookie: cookieB,
    body: { itemId: state.item.id, answer: state.item.options[0] },
  });
  assert.equal(foreign.status, 404);
  for (let i = 0; i < 36; i++) {
    const q = diagnosticItems.find((q) => q.id === state.item.id);
    state = (
      await request(`/placement/${state.id}/answer`, {
        method: "POST",
        cookie: cookieA,
        body: { itemId: q.id, answer: q.answer },
      })
    ).data;
  }
  assert.equal(state.finished, true);
  assert.equal(state.results.length, 2);
  assert.equal(state.results[0].count, 18);
  assert.equal(state.results[1].correct, 18);
  assert.ok(state.results[0].range > 0);
  assert.equal(
    (await request("/dashboard", { cookie: cookieA })).data.baseline.length,
    2,
  );
});
test("writing checklist saves attempt without inventing AI band", async () => {
  const r = await request("/attempts", {
    method: "POST",
    cookie: cookieB,
    body: { lessonId: "w1", text: "This is my short essay.", minutes: 3 },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.source, "checklist");
  assert.equal(r.data.estimated_band, null);
  assert.ok(r.data.error_tags.includes("under_word_limit"));
});
test("private audio, export and progress sharing require owner and mutual opt-in", async () => {
  const rec = await request("/recordings", {
    method: "POST",
    cookie: cookieA,
    body: {
      lessonId: "s1",
      mime: "audio/webm",
      audio: Buffer.from("mock audio data").toString("base64"),
    },
  });
  assert.equal(rec.status, 201);
  assert.equal(
    (await request("/recordings/" + rec.data.id, { cookie: cookieB })).status,
    404,
  );
  const own = await fetch(url + "/api/recordings/" + rec.data.id, {
    headers: { Cookie: cookieA },
  });
  assert.equal(own.status, 200);
  assert.equal(await own.text(), "mock audio data");
  assert.equal(
    (await request("/export", { cookie: cookieB })).data.user.id,
    idB,
  );
  const p = {
    testType: "Academic",
    target: 7,
    examDate: "",
    dailyMinutes: 45,
    shareProgress: true,
  };
  await request("/profile", { method: "PUT", cookie: cookieA, body: p });
  assert.equal(
    (await request("/dashboard", { cookie: cookieA })).data.peers.length,
    0,
  );
  await request("/profile", { method: "PUT", cookie: cookieB, body: p });
  assert.equal(
    (await request("/dashboard", { cookie: cookieA })).data.peers.length,
    1,
  );
});
test("six prompt families preserve original-content and estimated-score constraints", () => {
  assert.equal(Object.keys(prompts).length, 6);
  Object.values(prompts).forEach((p) => {
    assert.match(p, /ORIGINAL/);
    assert.match(p, /official IELTS score/);
  });
  assert.match(assessmentPrompt, /Pronunciation/);
  assert.match(assessmentPrompt, /must be null/);
});
test("logout invalidates session", async () => {
  assert.equal(
    (
      await request("/auth/logout", {
        method: "POST",
        cookie: cookieB,
        body: {},
      })
    ).status,
    200,
  );
  assert.equal((await request("/me", { cookie: cookieB })).status, 401);
});
test("optional invitation code protects registration before public deployment", async () => {
  const isolated = openDatabase(":memory:");
  const srv = createApp(isolated, { staticDir: "/tmp/no-static" }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((r) => srv.once("listening", r));
  const previous = process.env.REGISTRATION_CODE;
  process.env.REGISTRATION_CODE = "private-invite-code";
  const base = `http://127.0.0.1:${srv.address().port}/api`;
  try {
    const body = {
      name: "Invited user",
      email: "invited@example.com",
      password: "invitation-test-password",
    };
    let res = await fetch(base + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    assert.equal(res.status, 403);
    res = await fetch(base + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        registrationCode: "private-invite-code",
      }),
    });
    assert.equal(res.status, 201);
  } finally {
    if (previous === undefined) delete process.env.REGISTRATION_CODE;
    else process.env.REGISTRATION_CODE = previous;
    srv.close();
    isolated.close();
  }
});
