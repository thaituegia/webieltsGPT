import { z } from "zod";
import { assessmentPrompt, prompts, PROMPT_VERSION } from "./prompts.js";
const score = z.number().min(0).max(9).nullable();
const schema = z.object({
  estimated_band: score,
  confidence: z.number().min(0).max(1),
  criteria: z
    .array(
      z.object({
        name: z.string(),
        score,
        evidence: z.string(),
        feedback: z.string(),
      }),
    )
    .length(4),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  rewrite_hint: z.string(),
  error_tags: z.array(z.string()),
  disclaimer: z.string(),
});
export function aiConfigured() {
  return Boolean(process.env.AI_API_KEY);
}
async function complete(system, data) {
  if (!aiConfigured())
    throw Object.assign(new Error("Chưa cấu hình AI_API_KEY trên server."), {
      status: 503,
    });
  const base = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const url = new URL(base + "/chat/completions");
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw new Error("AI provider phải dùng HTTPS.");
  const res = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(45000),
    headers: {
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || "gpt-4.1-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(data) },
      ],
    }),
  });
  if (!res.ok)
    throw Object.assign(
      new Error(
        `AI provider trả về lỗi ${res.status}. Kiểm tra cấu hình server.`,
      ),
      { status: 502 },
    );
  const result = await res.json();
  try {
    return JSON.parse(result.choices[0].message.content);
  } catch {
    throw Object.assign(
      new Error("AI trả về nội dung không hợp lệ; chưa lưu kết quả."),
      { status: 502 },
    );
  }
}
export async function assess(lesson, response) {
  const result = schema.parse(
    await complete(assessmentPrompt, {
      skill: lesson.skill,
      task: lesson.text,
      response,
    }),
  );
  if (lesson.skill === "Speaking") {
    result.estimated_band = null;
    result.criteria = result.criteria.map((c) =>
      /pronunciation/i.test(c.name)
        ? {
            ...c,
            score: null,
            evidence: "Không có đánh giá âm thanh.",
            feedback:
              "Cần giáo viên hoặc hệ thống phân tích âm thanh để chấm phát âm.",
          }
        : c,
    );
  }
  if (response.trim().split(/\s+/).length < 50) {
    result.estimated_band = null;
    result.confidence = Math.min(0.3, result.confidence);
  }
  return {
    ...result,
    source: "ai",
    prompt_version: PROMPT_VERSION,
    disclaimer:
      "Band luyện tập ước lượng từ AI, không phải điểm IELTS chính thức.",
  };
}
export async function generate(skill, options) {
  const body = await complete(prompts[skill], options);
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("Nội dung AI không hợp lệ.");
  return body;
}
export function localFeedback(lesson, response) {
  const words = response.trim() ? response.trim().split(/\s+/).length : 0;
  return {
    source: "checklist",
    estimated_band: null,
    confidence: 0,
    word_count: words,
    criteria: [],
    strengths:
      words >= lesson.minimumWords ? ["Đã đạt số từ tối thiểu của bài."] : [],
    improvements:
      lesson.skill === "Writing"
        ? [
            "Kiểm tra lập trường hoặc overview rõ ràng.",
            "Mỗi ý chính cần giải thích và ví dụ hỗ trợ.",
            "Rà soát liên kết đoạn, collocation và cấu trúc câu.",
            ...(words < (lesson.minimumWords || 0)
              ? [`Cần ít nhất ${lesson.minimumWords} từ; hiện có ${words} từ.`]
              : []),
          ]
        : [
            "Trả lời trực tiếp rồi bổ sung lý do và ví dụ.",
            "Nghe lại bản ghi để tự kiểm tra độ trôi chảy.",
            "Chưa thể đánh giá phát âm từ văn bản.",
          ],
    rewrite_hint:
      "Chọn một ý chưa được giải thích rõ và tự viết lại trước khi xem đáp án mẫu.",
    error_tags: words < (lesson.minimumWords || 0) ? ["under_word_limit"] : [],
    disclaimer:
      "Checklist tự kiểm tra, chưa phải phản hồi AI. Cấu hình AI_API_KEY để bật đánh giá bằng AI.",
  };
}
