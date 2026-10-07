import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import {
  randomUUID,
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { z } from "zod";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import {
  lessons,
  vocabulary,
  publicLesson,
  diagnosticItems,
  publicDiagnostic,
} from "./content.js";
import { nextItem, estimate } from "./adaptive.js";
import { aiConfigured, assess, generate, localFeedback } from "./ai.js";
import { PROMPT_VERSION } from "./prompts.js";
const now = () => new Date().toISOString();
const hash = (t) => createHash("sha256").update(t).digest("hex");
const profileSchema = z.object({
  testType: z.enum(["Academic", "General Training"]),
  target: z.number().min(3).max(9).multipleOf(0.5),
  examDate: z
    .string()
    .refine(
      (v) =>
        v === "" ||
        (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
          !Number.isNaN(Date.parse(v)) &&
          new Date(v).toISOString().slice(0, 10) === v),
    ),
  dailyMinutes: z.number().int().min(10).max(180),
  shareProgress: z.boolean(),
});
const initialProfile = {
  testType: "Academic",
  target: 6.5,
  examDate: "",
  dailyMinutes: 45,
  shareProgress: false,
};
export function createApp(db, { staticDir = resolve("dist") } = {}) {
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          mediaSrc: ["'self'", "blob:"],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json({ limit: "8mb" }));
  app.use("/api", (req, res, next) => {
    if (
      ["POST", "PUT", "DELETE", "PATCH"].includes(req.method) &&
      req.headers.origin
    ) {
      try {
        if (new URL(req.headers.origin).host !== req.get("host"))
          return res.status(403).json({ error: "Nguồn yêu cầu không hợp lệ." });
      } catch {
        return res.status(403).json({ error: "Nguồn yêu cầu không hợp lệ." });
      }
    }
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
    }),
  );
  const authLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 20,
    message: { error: "Quá nhiều lần đăng nhập. Thử lại sau 15 phút." },
  });
  function session(req, res, userId) {
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
      hash(token),
      userId,
      Date.now() + 7 * 86400000,
    );
    res.cookie("session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 7 * 86400000,
      path: "/",
    });
  }
  function publicUser(u) {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      profile: JSON.parse(u.profile),
    };
  }
  app.get("/api/health", (_req, res) =>
    res.json({
      ok: true,
      aiConfigured: aiConfigured(),
      promptVersion: PROMPT_VERSION,
      registrationCodeRequired: Boolean(process.env.REGISTRATION_CODE),
    }),
  );
  app.post("/api/auth/register", authLimit, (req, res) => {
    const d = z
      .object({
        name: z.string().trim().min(2).max(60),
        email: z.string().trim().email().max(254),
        password: z.string().min(10).max(128),
        registrationCode: z.string().max(200).optional(),
      })
      .parse(req.body);
    if (
      process.env.REGISTRATION_CODE &&
      (!d.registrationCode ||
        !timingSafeEqual(
          Buffer.from(hash(d.registrationCode)),
          Buffer.from(hash(process.env.REGISTRATION_CODE)),
        ))
    )
      return res.status(403).json({ error: "Mã tham gia không đúng." });
    if (db.prepare("SELECT COUNT(*) AS n FROM users").get().n >= 2)
      return res
        .status(409)
        .json({ error: "Không gian này có tối đa hai tài khoản." });
    const email = d.email.toLowerCase();
    if (db.prepare("SELECT id FROM users WHERE email=?").get(email))
      return res.status(409).json({ error: "Email đã được sử dụng." });
    const salt = randomBytes(16).toString("hex"),
      password = `${salt}:${scryptSync(d.password, salt, 64).toString("hex")}`,
      id = randomUUID();
    db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?)").run(
      id,
      d.name,
      email,
      password,
      JSON.stringify(initialProfile),
      now(),
    );
    session(req, res, id);
    res
      .status(201)
      .json(publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(id)));
  });
  app.post("/api/auth/login", authLimit, (req, res) => {
    const d = z
        .object({ email: z.string().email(), password: z.string().max(128) })
        .parse(req.body),
      u = db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(d.email.toLowerCase());
    const [salt, stored] = (
      u?.password || "dummy:" + scryptSync("dummy", "dummy", 64).toString("hex")
    ).split(":");
    const valid = timingSafeEqual(
      scryptSync(d.password, salt, 64),
      Buffer.from(stored, "hex"),
    );
    if (!u || !valid)
      return res.status(401).json({ error: "Email hoặc mật khẩu chưa đúng." });
    session(req, res, u.id);
    res.json(publicUser(u));
  });
  app.use("/api", (req, res, next) => {
    const token = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("session="))
      ?.slice(8);
    const row =
      token &&
      db
        .prepare(
          "SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?",
        )
        .get(hash(token), Date.now());
    if (!row) return res.status(401).json({ error: "Vui lòng đăng nhập." });
    req.user = row;
    req.sessionToken = token;
    next();
  });
  app.get("/api/me", (req, res) => res.json(publicUser(req.user)));
  app.post("/api/auth/logout", (req, res) => {
    db.prepare("DELETE FROM sessions WHERE token=?").run(
      hash(req.sessionToken),
    );
    res.clearCookie("session", { path: "/" });
    res.json({ ok: true });
  });
  app.put("/api/profile", (req, res) => {
    const p = profileSchema.parse(req.body);
    db.prepare("UPDATE users SET profile=? WHERE id=?").run(
      JSON.stringify(p),
      req.user.id,
    );
    res.json({ ...publicUser(req.user), profile: p });
  });
  app.get("/api/lessons", (req, res) => {
    const p = JSON.parse(req.user.profile);
    res.json(
      lessons
        .filter(
          (l) =>
            l.skill !== "Writing" ||
            (p.testType === "Academic"
              ? l.mode !== "General Training"
              : l.id !== "w2"),
        )
        .map(publicLesson),
    );
  });
  app.get("/api/vocabulary", (req, res) => {
    const rows = db
      .prepare("SELECT * FROM reviews WHERE user_id=?")
      .all(req.user.id);
    res.json(
      vocabulary.map((v) => ({
        ...v,
        review: rows.find((r) => r.word_id === v.id) || null,
      })),
    );
  });
  app.post("/api/vocabulary/:id/review", (req, res) => {
    if (!vocabulary.some((v) => v.id === req.params.id))
      return res.status(404).json({ error: "Không tìm thấy từ." });
    const { remembered } = z
        .object({ remembered: z.boolean() })
        .parse(req.body),
      prev = db
        .prepare("SELECT * FROM reviews WHERE user_id=? AND word_id=?")
        .get(req.user.id, req.params.id);
    const interval = remembered
      ? Math.min(60, prev ? Math.max(1, prev.interval * 2) : 1)
      : 0;
    const due = new Date(
      Date.now() + (remembered ? interval * 86400000 : 10 * 60000),
    ).toISOString();
    db.prepare(
      "INSERT INTO reviews VALUES(?,?,?,?) ON CONFLICT(user_id,word_id) DO UPDATE SET interval=excluded.interval,due=excluded.due",
    ).run(req.user.id, req.params.id, interval, due);
    res.json({ interval, due });
  });
  app.get("/api/dashboard", (req, res) => {
    const attempts = db
      .prepare("SELECT * FROM attempts WHERE user_id=? ORDER BY created DESC")
      .all(req.user.id)
      .map((a) => ({
        ...a,
        response: JSON.parse(a.response),
        result: JSON.parse(a.result),
      }));
    const week = attempts.filter(
      (a) => Date.now() - Date.parse(a.created) < 7 * 86400000,
    );
    const errors = {};
    attempts.forEach((a) =>
      (a.result.error_tags || []).forEach(
        (t) => (errors[t] = (errors[t] || 0) + 1),
      ),
    );
    const diagnostics = db
      .prepare(
        "SELECT * FROM diagnostics WHERE user_id=? AND finished=1 ORDER BY created DESC LIMIT 1",
      )
      .get(req.user.id);
    const baseline = diagnostics
      ? ["Reading", "Listening"].map((skill) => ({
          skill,
          ...estimate(JSON.parse(diagnostics.responses), skill),
        }))
      : [];
    const skillStats = ["Listening", "Reading", "Writing", "Speaking"].map(
      (skill) => {
        const own = attempts.filter((a) => a.skill === skill),
          scored = own.find((a) => a.result.estimated_band != null),
          correct = own.reduce((a, b) => a + (b.result.correct || 0), 0),
          total = own.reduce((a, b) => a + (b.result.total || 0), 0);
        return {
          skill,
          count: own.length,
          band:
            scored?.result.estimated_band ??
            baseline.find((b) => b.skill === skill)?.estimate ??
            null,
          confidence: scored?.result.confidence ?? null,
          accuracy: total ? Math.round((correct / total) * 100) : null,
        };
      },
    );
    const completed = new Set(
      attempts
        .filter((a) => a.created.slice(0, 10) === now().slice(0, 10))
        .map((a) => a.lesson_id),
    );
    const p = JSON.parse(req.user.profile),
      weak = Object.entries(errors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
      readId = weak.some(([t]) => t === "NOT_GIVEN_as_FALSE") ? "r1" : "r2";
    const plan = [
      lessons.find((l) => l.id === readId),
      lessons.find((l) => l.id === "l1"),
      lessons.find((l) => l.id === "w1"),
    ].map((l) => ({ ...publicLesson(l), completed: completed.has(l.id) }));
    const allUsers = db
      .prepare("SELECT * FROM users WHERE id<>?")
      .all(req.user.id);
    const peers = p.shareProgress
      ? allUsers
          .filter((u) => JSON.parse(u.profile).shareProgress)
          .map((u) => ({
            name: u.name,
            weeklyMinutes: db
              .prepare(
                "SELECT COALESCE(SUM(minutes),0) AS n FROM attempts WHERE user_id=? AND created>?",
              )
              .get(u.id, new Date(Date.now() - 7 * 86400000).toISOString()).n,
          }))
      : [];
    const reviews = db
      .prepare("SELECT * FROM reviews WHERE user_id=?")
      .all(req.user.id);
    res.json({
      skillStats,
      weeklyMinutes: week.reduce((n, a) => n + a.minutes, 0),
      weeklyActivity: Array.from({ length: 7 }, (_, i) => {
        const date = new Date(Date.now() - (6 - i) * 86400000)
          .toISOString()
          .slice(0, 10);
        return {
          date,
          minutes: attempts
            .filter((a) => a.created.startsWith(date))
            .reduce((n, a) => n + a.minutes, 0),
        };
      }),
      attempts: attempts.slice(0, 30),
      topErrors: weak,
      plan,
      baseline,
      vocabulary: {
        reviewed: reviews.length,
        due:
          vocabulary.length -
          reviews.length +
          reviews.filter((r) => r.due <= now()).length,
        retained: reviews.filter((r) => r.interval >= 2).length,
      },
      peers,
    });
  });
  app.get("/api/drafts/:id", (req, res) =>
    res.json({
      body:
        db
          .prepare("SELECT body FROM drafts WHERE user_id=? AND lesson_id=?")
          .get(req.user.id, req.params.id)?.body || "",
    }),
  );
  app.put("/api/drafts/:id", (req, res) => {
    const { body } = z.object({ body: z.string().max(30000) }).parse(req.body);
    if (!lessons.some((l) => l.id === req.params.id))
      return res.status(404).json({ error: "Không tìm thấy bài." });
    db.prepare(
      "INSERT INTO drafts VALUES(?,?,?) ON CONFLICT(user_id,lesson_id) DO UPDATE SET body=excluded.body",
    ).run(req.user.id, req.params.id, body);
    res.json({ ok: true });
  });
  const aiLimit = rateLimit({
    windowMs: 3600000,
    limit: 15,
    keyGenerator: (req) => req.user.id,
    message: { error: "Đã đạt giới hạn 15 yêu cầu AI mỗi giờ." },
  });
  app.post(
    "/api/attempts",
    (req, res, next) => (req.body?.useAI ? aiLimit(req, res, next) : next()),
    async (req, res) => {
      const d = z
        .object({
          lessonId: z.string(),
          answers: z.record(z.string()).optional(),
          text: z.string().max(30000).optional(),
          minutes: z.number().int().min(0).max(120),
          useAI: z.boolean().default(false),
          mode: z.enum(["practice", "exam"]).default("practice"),
        })
        .parse(req.body);
      const lesson = lessons.find((l) => l.id === d.lessonId);
      if (!lesson)
        return res.status(404).json({ error: "Không tìm thấy bài." });
      let result;
      if (lesson.questions) {
        if (
          lesson.questions.some(
            (q) => !d.answers?.[q.id] || !q.options.includes(d.answers[q.id]),
          )
        )
          return res
            .status(400)
            .json({ error: "Vui lòng trả lời đầy đủ các câu hỏi." });
        const prior = db
          .prepare(
            "SELECT id FROM attempts WHERE user_id=? AND lesson_id=? LIMIT 1",
          )
          .get(req.user.id, lesson.id);
        const details = lesson.questions.map((q) => ({
          id: q.id,
          text: q.text,
          answer: q.answer,
          response: d.answers[q.id],
          correct: d.answers[q.id] === q.answer,
          evidence: q.evidence,
          tag: q.tag,
        }));
        result = {
          source: "answer-key",
          correct: details.filter((q) => q.correct).length,
          total: details.length,
          details,
          error_tags: [
            ...new Set(details.filter((q) => !q.correct).map((q) => q.tag)),
          ],
          repeated: Boolean(prior),
          estimated_band: null,
          disclaimer:
            "Bài luyện ngắn: độ chính xác không quy đổi trực tiếp thành IELTS band.",
        };
      } else {
        if (!d.text?.trim())
          return res
            .status(400)
            .json({ error: "Vui lòng nhập câu trả lời hoặc bản chép lời." });
        result = d.useAI
          ? await assess(lesson, d.text)
          : localFeedback(lesson, d.text);
      }
      const id = randomUUID();
      db.prepare("INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?)").run(
        id,
        req.user.id,
        lesson.id,
        lesson.skill,
        JSON.stringify({ answers: d.answers, text: d.text, mode: d.mode }),
        JSON.stringify(result),
        d.minutes,
        now(),
      );
      res.status(201).json({ id, ...result });
    },
  );
  const diagnosticState = (row) => {
    const responses = JSON.parse(row.responses);
    return {
      id: row.id,
      finished: Boolean(row.finished),
      answered: responses.length,
      total: 36,
      item: row.finished ? null : publicDiagnostic(nextItem(responses)),
      results: row.finished
        ? ["Reading", "Listening"].map((skill) => ({
            skill,
            ...estimate(responses, skill),
          }))
        : null,
    };
  };
  app.post("/api/placement", (req, res) => {
    let row = db
      .prepare(
        "SELECT * FROM diagnostics WHERE user_id=? AND finished=0 ORDER BY created DESC LIMIT 1",
      )
      .get(req.user.id);
    if (!row) {
      const id = randomUUID();
      db.prepare("INSERT INTO diagnostics VALUES(?,?,?,0,?)").run(
        id,
        req.user.id,
        "[]",
        now(),
      );
      row = db.prepare("SELECT * FROM diagnostics WHERE id=?").get(id);
    }
    res.json(diagnosticState(row));
  });
  app.post("/api/placement/:id/answer", (req, res) => {
    const row = db
      .prepare(
        "SELECT * FROM diagnostics WHERE id=? AND user_id=? AND finished=0",
      )
      .get(req.params.id, req.user.id);
    if (!row)
      return res.status(404).json({ error: "Không tìm thấy phiên kiểm tra." });
    const { itemId, answer } = z
        .object({ itemId: z.string(), answer: z.string() })
        .parse(req.body),
      responses = JSON.parse(row.responses),
      q = nextItem(responses);
    if (q.id !== itemId || !q.options.includes(answer))
      return res.status(400).json({ error: "Câu trả lời không hợp lệ." });
    responses.push({
      id: q.id,
      skill: q.skill,
      difficulty: q.difficulty,
      correct: answer === q.answer,
    });
    row.responses = JSON.stringify(responses);
    row.finished = responses.length >= 36 ? 1 : 0;
    db.prepare("UPDATE diagnostics SET responses=?,finished=? WHERE id=?").run(
      row.responses,
      row.finished,
      row.id,
    );
    res.json(diagnosticState(row));
  });
  app.post("/api/recordings", (req, res) => {
    const d = z
      .object({
        lessonId: z.string(),
        mime: z.enum([
          "audio/webm",
          "audio/webm;codecs=opus",
          "audio/ogg",
          "audio/ogg;codecs=opus",
          "audio/mp4",
        ]),
        audio: z.string().max(7000000),
      })
      .parse(req.body);
    if (!lessons.some((l) => l.id === d.lessonId && l.skill === "Speaking"))
      return res.status(400).json({ error: "Bài Speaking không hợp lệ." });
    const audio = Buffer.from(d.audio, "base64");
    if (!audio.length || audio.length > 5 * 1024 * 1024)
      return res.status(400).json({ error: "Bản ghi phải nhỏ hơn 5MB." });
    const quota = db
      .prepare(
        "SELECT COALESCE(SUM(length(audio)),0) AS n FROM recordings WHERE user_id=?",
      )
      .get(req.user.id).n;
    if (quota + audio.length > 100 * 1024 * 1024)
      return res.status(413).json({ error: "Đã đạt giới hạn 100MB bản ghi." });
    const id = randomUUID();
    db.prepare("INSERT INTO recordings VALUES(?,?,?,?,?,?)").run(
      id,
      req.user.id,
      d.lessonId,
      d.mime,
      audio,
      now(),
    );
    res.status(201).json({ id });
  });
  app.get("/api/recordings", (req, res) =>
    res.json(
      db
        .prepare(
          "SELECT id,lesson_id,created FROM recordings WHERE user_id=? ORDER BY created DESC",
        )
        .all(req.user.id),
    ),
  );
  app.get("/api/recordings/:id", (req, res) => {
    const r = db
      .prepare("SELECT * FROM recordings WHERE id=? AND user_id=?")
      .get(req.params.id, req.user.id);
    if (!r) return res.status(404).json({ error: "Không tìm thấy bản ghi." });
    res
      .set({ "Content-Type": r.mime, "Cache-Control": "private, no-store" })
      .send(Buffer.from(r.audio));
  });
  app.delete("/api/recordings/:id", (req, res) => {
    db.prepare("DELETE FROM recordings WHERE id=? AND user_id=?").run(
      req.params.id,
      req.user.id,
    );
    res.json({ ok: true });
  });
  app.post("/api/ai/generate", aiLimit, async (req, res) => {
    const d = z
      .object({
        skill: z.enum([
          "Reading",
          "Listening",
          "Writing",
          "Speaking",
          "Vocabulary",
          "Placement",
        ]),
        band: z.number().min(3).max(7),
        topic: z.string().trim().min(2).max(100),
        mode: z.enum(["Academic", "General Training"]),
      })
      .parse(req.body);
    const body = await generate(d.skill, {
      ...d,
      question_count: 6,
      word_count: 500,
      part: 2,
      n: 10,
    });
    const id = randomUUID();
    db.prepare("INSERT INTO generated VALUES(?,?,?,?,?,?,?)").run(
      id,
      req.user.id,
      d.skill,
      JSON.stringify(body),
      "needs_human_review",
      PROMPT_VERSION,
      now(),
    );
    res
      .status(201)
      .json({
        id,
        status: "needs_human_review",
        body,
        promptVersion: PROMPT_VERSION,
      });
  });
  app.get("/api/ai/generated", (req, res) =>
    res.json(
      db
        .prepare(
          "SELECT id,skill,status,version,created FROM generated WHERE user_id=? ORDER BY created DESC",
        )
        .all(req.user.id),
    ),
  );
  app.get("/api/ai/generated/:id", (req, res) => {
    const r = db
      .prepare(
        "SELECT id,skill,body,status,version FROM generated WHERE id=? AND user_id=?",
      )
      .get(req.params.id, req.user.id);
    if (!r)
      return res.status(404).json({ error: "Không tìm thấy bản nháp AI." });
    res.json({
      id: r.id,
      body: JSON.parse(r.body),
      status: r.status,
      promptVersion: r.version,
    });
  });
  app.get("/api/export", (req, res) => {
    const data = {
      user: publicUser(req.user),
      attempts: db
        .prepare(
          "SELECT lesson_id,skill,response,result,minutes,created FROM attempts WHERE user_id=?",
        )
        .all(req.user.id),
      drafts: db
        .prepare("SELECT lesson_id,body FROM drafts WHERE user_id=?")
        .all(req.user.id),
      reviews: db
        .prepare("SELECT word_id,interval,due FROM reviews WHERE user_id=?")
        .all(req.user.id),
    };
    res.attachment("ielts-duo-progress.json").json(data);
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API không tồn tại." }),
  );
  if (existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(resolve(staticDir, "index.html")),
    );
  }
  app.use((err, _req, res, _next) => {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({
          error: "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các trường.",
        });
    if (err.type === "entity.too.large")
      return res.status(413).json({ error: "Nội dung vượt quá giới hạn." });
    console.error("Request failed:", err.name);
    res
      .status(err.status || 500)
      .json({
        error: err.status
          ? err.message
          : "Không thể xử lý yêu cầu. Vui lòng thử lại.",
      });
  });
  return app;
}
