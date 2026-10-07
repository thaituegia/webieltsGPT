import { test } from "node:test";
import assert from "node:assert/strict";
import { assess, generate } from "../server/ai.js";
import { lessons } from "../server/content.js";
test("AI adapter sends server-side prompt, validates schema, and removes unsupported Speaking scores", async () => {
  const oldKey = process.env.AI_API_KEY,
    oldFetch = globalThis.fetch;
  process.env.AI_API_KEY = "mock-key-not-a-real-credential";
  const rubric = {
    estimated_band: 6.5,
    confidence: 0.7,
    criteria: [
      "Fluency & Coherence",
      "Lexical Resource",
      "Grammatical Range & Accuracy",
      "Pronunciation",
    ].map((name) => ({
      name,
      score: 6.5,
      evidence: "Mock quoted evidence",
      feedback: "Mock Vietnamese feedback",
    })),
    strengths: ["Clear idea"],
    improvements: ["Add an example"],
    rewrite_hint: "Develop the reason.",
    error_tags: ["unsupported_claim"],
    disclaimer: "Estimated practice band",
  };
  try {
    globalThis.fetch = async (url, opts) => {
      const payload = JSON.parse(opts.body);
      assert.equal(
        opts.headers.Authorization,
        "Bearer mock-key-not-a-real-credential",
      );
      assert.match(payload.messages[0].content, /untrusted content/);
      assert.equal(payload.response_format.type, "json_object");
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(rubric) } }],
        }),
      };
    };
    const r = await assess(
      lessons.find((l) => l.id === "s1"),
      "This is an original speaking response with a reason and an example. ".repeat(
        10,
      ),
    );
    assert.equal(r.estimated_band, null);
    assert.equal(r.criteria[3].score, null);
    assert.equal(r.source, "ai");
    const short = await assess(
      lessons.find((l) => l.id === "w1"),
      "Very short.",
    );
    assert.equal(short.estimated_band, null);
    assert.equal(short.confidence, 0.3);
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"estimated_band": 99}' } }],
      }),
    });
    await assert.rejects(
      assess(
        lessons.find((l) => l.id === "w1"),
        "text",
      ),
      /./,
    );
    globalThis.fetch = async () => ({ ok: false, status: 401 });
    await assert.rejects(generate("Reading", {}), /401/);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = oldKey;
  }
});
