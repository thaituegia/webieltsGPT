import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const fixtureDir = mkdtempSync(join(tmpdir(), "ielts-duo-browser-"));
import { spawn } from "node:child_process";
const server = spawn(process.execPath, ["server/index.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: "3003",
    DATABASE_PATH: join(fixtureDir, "test.sqlite"),
  },
});
(async () => {
  await new Promise((resolve, reject) => {
    server.stdout.once("data", resolve);
    server.once("error", reject);
  });
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE || undefined,
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:3003");
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await page.getByLabel("Tên của bạn").fill("Mai Nguyen");
  await page
    .getByLabel("Email", { exact: true })
    .fill("browser-fresh@example.com");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("browser-test-password");
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await page.getByRole("heading", { name: /Chào Nguyen/ }).waitFor();
  await page.screenshot({
    path: join(fixtureDir, "dashboard-desktop.png"),
    fullPage: true,
  });
  await page
    .locator("nav")
    .getByRole("button", { name: "Luyện tập", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Khi thành phố trở nên xanh hơn/ })
    .click();
  const answers = ["FALSE", "TRUE", "NOT GIVEN", "FALSE", "FALSE", "TRUE"];
  const fields = page.locator("fieldset");
  for (let i = 0; i < answers.length; i++)
    await fields.nth(i).getByLabel(answers[i], { exact: true }).check();
  await page.getByRole("button", { name: "Nộp bài & xem bằng chứng" }).click();
  await page.getByText("/ 6 câu đúng").waitFor();
  await page.getByRole("button", { name: "Về không gian học" }).click();
  await page
    .getByRole("button", { name: /Công nghệ & cách chúng ta học/ })
    .click();
  await page
    .getByLabel("Bài viết của bạn")
    .fill(
      "Online learning can make education more accessible. However, students also need personal feedback and practical experience.",
    );
  await page.getByText("Đã lưu bản nháp").waitFor();
  await page.getByRole("button", { name: "Đóng bài luyện" }).click();
  await page
    .getByRole("button", { name: /Công nghệ & cách chúng ta học/ })
    .click();
  await page.waitForFunction(() =>
    document.querySelector("textarea")?.value.startsWith("Online learning"),
  );
  await page
    .getByLabel("Bài viết của bạn")
    .fill("An immediate draft close must save this latest response.");
  await page.getByRole("button", { name: "Đóng bài luyện" }).click();
  await page
    .getByRole("button", { name: /Công nghệ & cách chúng ta học/ })
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector("textarea")
      ?.value.startsWith("An immediate draft close"),
  );
  await page.getByRole("button", { name: "Lưu bài & xem checklist" }).click();
  await page
    .getByText("Checklist tự kiểm tra · Không gán band", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Về không gian học" }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Từ vựng", exact: true })
    .click();
  await page.getByRole("button", { name: "Lật thẻ · Xem nghĩa" }).click();
  await page.getByRole("button", { name: "Đã nhớ", exact: true }).click();
  await page.getByRole("heading", { name: "commute", exact: true }).waitFor();
  await page
    .locator("nav")
    .getByRole("button", { name: "Tiến độ", exact: true })
    .click();
  await page.getByRole("heading", { name: "Lịch sử học tập" }).waitFor();
  assert.equal(await page.locator("tbody tr").count(), 2);
  await page.getByRole("button", { name: "Cài đặt tài khoản" }).click();
  await page.getByLabel("Band mục tiêu").selectOption("7");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await page.getByText("Đã lưu mục tiêu và sở thích học tập.").waitFor();
  await page
    .locator("nav")
    .getByRole("button", { name: "Tổng quan", exact: true })
    .click();
  await page.getByRole("button", { name: "Kiểm tra trình độ đầu vào" }).click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Câu tiếp theo" }).click();
  await page.getByText("Reading · Câu 2/36").waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Mở menu" }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Tổng quan", exact: true })
    .click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: join(fixtureDir, "dashboard-mobile.png"),
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  assert.equal(overflow, false, "mobile must not overflow");
  await page.getByRole("button", { name: "Mở menu" }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Luyện tập", exact: true })
    .click();
  await page.getByRole("button", { name: /Một nơi bạn muốn quay lại/ }).click();
  await page.screenshot({
    path: join(fixtureDir, "speaking-mobile.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: desktop/mobile registration, dashboard, answer scoring, draft persistence, writing checklist, SRS, progress, profile, adaptive placement, speaking UI. No page errors or mobile overflow.",
  );
  await browser.close();
  server.kill("SIGTERM");
  await new Promise((r) => server.once("exit", r));
  rmSync(fixtureDir, { recursive: true, force: true });
})().catch((e) => {
  console.error(e);
  server.kill("SIGTERM");
  console.error("Failure artifacts:", fixtureDir);
  process.exit(1);
});
