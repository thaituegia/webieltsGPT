# IELTS Duo

Website luyện IELTS cho hai người dùng độc lập, xây bằng **React 19 + Vite** và **Node.js 24 + Express 5 + SQLite**. Giao diện tiếng Việt, nội dung luyện tập tiếng Anh. Yêu cầu và sáu nhóm prompt được chuyển từ báo cáo PDF người dùng cung cấp; lựa chọn React + Node.js ưu tiên theo yêu cầu trực tiếp của người dùng.

## Chạy trên máy / cloud

Cần **Node.js 24 trở lên** (SQLite tích hợp), npm và trình duyệt hiện đại.

```bash
npm ci
cp .env.example .env
npm run dev
```

Vite chạy ở cổng 5173 và proxy `/api` đến Node ở cổng 3001. Không cần Supabase, PostgreSQL hay tài khoản AI để sử dụng ngân hàng bài luyện có sẵn. Dữ liệu thật nằm ở `data/ielts.sqlite`, không được commit vào Git. Lần mở đầu tiên, chọn **Tạo tài khoản**; mỗi tài khoản dùng email và mật khẩu riêng (tối thiểu 10 ký tự). Không có mật khẩu hoặc tài khoản mặc định.

Bản production:

```bash
npm test
npm run build
npm start
```

Node phục vụ cả giao diện đã build và API ở cổng 3001. Kiểm tra server: `GET /api/health` trả `ok: true`. Đây là lệnh kiểm tra nội bộ, không phải link preview cloud.

## Chức năng đã triển khai

- Đăng ký tối đa **hai** tài khoản; hash mật khẩu bằng scrypt, cookie HttpOnly/SameSite, phiên hết hạn sau 7 ngày, rate limit và kiểm tra Origin. Mỗi truy vấn dữ liệu cá nhân đều gắn user ID từ phiên đăng nhập.
- Dashboard dựa trên dữ liệu thật: bốn kỹ năng, mục tiêu, phút học tuần, lịch sử, từ đến hạn ôn và ba lỗi thường gặp. Khi chưa có điểm, hiển thị trống thay vì số mẫu.
- 10 bài luyện gốc: 2 Reading, 2 Listening, 3 Writing, 3 Speaking và các biến thể theo test type (hiển thị 9 theo loại thi). Reading/Listening chấm đáp án tại server, trả bằng chứng và error tags. Bài đã gặp được đánh dấu, không dùng làm chẩn đoán mới.
- 12 lexical targets có nghĩa tiếng Việt, định nghĩa, collocation, câu ví dụ, word family và lỗi thường gặp. SRS: nhớ → 1/2/4/8/.../60 ngày; quên → 10 phút.
- Chẩn đoán 36 câu (18 Reading + 18 Listening): Bayesian Rasch grid với prior, chọn item gần ability estimate, lưu từng đáp án để tiếp tục sau. Trả ước lượng và khoảng bất định. Item difficulty do tác giả gán, **chưa hiệu chỉnh tâm trắc hoặc giám khảo**.
- Writing: đếm từ, yêu cầu Task 1/2, bảng dữ liệu gốc cho Academic Task 1, thư GT Task 1, lưu bản nháp phía server để tiếp tục trên thiết bị khác.
- Speaking: câu hỏi, follow-up, ghi âm tối đa 3 phút/5MB và lưu riêng tư; có nghe lại/xóa, quota 100MB mỗi tài khoản. Ghi âm cần HTTPS hoặc localhost. Nhập bản chép lời để nhận phản hồi ngôn ngữ; **chưa có STT tự động**.
- Practice mode cho phép pause, nghe lại/transcript; chế độ thi thử bài ngắn khóa pause/transcript và chỉ phát Listening một lần. Đồng hồ thời gian gợi ý **không tự nộp bài**. Không gọi bài luyện ngắn là full mock.
- Lộ trình quy tắc đơn giản: ưu tiên Reading TFNG nếu có lỗi `NOT_GIVEN_as_FALSE`, kèm Listening và Writing; chưa có dự báo ngày đạt band hay lịch tuần bằng AI.
- Cài đặt Academic/General Training, mục tiêu half-band, ngày thi, thời lượng học. Tiến độ tổng hợp chỉ chia sẻ khi **cả hai cùng bật**; không chia sẻ bài làm/bản ghi.
- Xuất dữ liệu tài khoản dạng JSON, giao diện responsive cho mobile/tablet/desktop.

## Kết nối AI

Trong `.env` của server:

```dotenv
AI_API_KEY=<nhập khóa của bạn trên server, không đưa vào Git>
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
```

Có thể dùng provider tương thích OpenAI Chat Completions hỗ trợ JSON response. API key **không** đi vào frontend. File `server/prompts.js` giữ sáu template theo báo cáo: Listening, Reading, Writing, Speaking, Vocabulary, Placement; version `pdf-v1.0` được lưu cùng kết quả. Timeout 45 giây, giới hạn tổng 15 yêu cầu AI/giờ/tài khoản.

- Writing AI trả rubric 4 tiêu chí, bằng chứng trích từ bài, strengths, improvements và gợi ý tự viết lại. AI response được kiểm tra schema. Bài quá ngắn không có band.
- Speaking từ **văn bản** chỉ phản hồi nội dung/ngôn ngữ; phát âm và band tổng luôn để trống. Không suy ra điểm phát âm từ transcript hay tốc độ gõ.
- Chưa cấu hình AI: lưu bài và checklist tự kiểm tra, **không giả lập AI hoặc tạo điểm band**.
- Nội dung AI sinh được lưu trạng thái `needs_human_review`, hiển thị bản nháp JSON, **không tự xuất bản** vào ngân hàng bài. Structural/evidence checks toàn diện, second-model critic, similarity scans và quy trình duyệt xuất bản cần phát triển tiếp. Tự kiểm tra trong prompt không thay thế kiểm duyệt người thật.

## Phạm vi và giới hạn rõ ràng

Đây là bản nền tảng chạy được, không phải toàn bộ sản phẩm 12 tuần/1.000+ đơn vị nội dung trong báo cáo. Nội dung gốc là ngân hàng khởi đầu, chưa được giáo viên IELTS thẩm định. Listening dùng Web Speech API (giọng TTS của trình duyệt), chưa có audio đa giọng/đa accent đã QA. Không có full mock 40 câu, native app, offline PWA, STT/TTS provider phía server, account recovery hay human scoring calibration. AI score chỉ là **estimated practice band**, không phải điểm IELTS chính thức. Full mock, cơ chế publication có QA, content expansion và calibration cần giai đoạn tiếp theo.

## Triển khai riêng tư

Trước khi mở website ra Internet:

1. Đặt `REGISTRATION_CODE` bí mật trong `.env` để chỉ hai người được mời đăng ký. Nếu chưa đặt, hai người đăng ký đầu tiên sẽ chiếm hai vị trí.
2. Dùng HTTPS reverse proxy; đặt `COOKIE_SECURE=true`. Chỉ đặt `TRUST_PROXY=true` khi server thực sự ở sau một reverse proxy tin cậy.
3. Mount/backup thư mục `data/` trên ổ đĩa bền. Dùng SQLite backup API hoặc dừng server trước khi sao chép DB để đảm bảo nhất quán WAL.
4. Giữ `.env` riêng tư; không ghi API key vào source. Node chạy một instance dùng cùng DB; không triển khai replica nhiều máy với SQLite local.

Docker tùy chọn:

```bash
docker compose up --build -d
```

Compose đọc `.env`; volume `ielts-data` giữ DB. Muốn thay PORT phải đồng thời đổi mapping trong compose. Phục hồi tài khoản hiện cần thao tác quản trị trên server; chưa có email reset password.

## Kiểm thử

```bash
npm test
npm run build
```

13 kiểm thử Node dùng SQLite in-memory riêng, không chạm DB người dùng. AI adapter được kiểm thử bằng mock provider (không phải gọi AI thật).

Kiểm thử giao diện tùy chọn bằng Chromium (đã chạy ở desktop và mobile):

```bash
npm run build
npx playwright install chromium
npm run test:browser
# Nếu máy đã có Chromium:
BROWSER_EXECUTABLE=/usr/bin/chromium npm run test:browser
```

Browser smoke dùng server/SQLite riêng ở cổng 3003, tạo fixture trong thư mục tạm và xóa sau khi thành công; không thêm tài khoản vào DB ứng dụng. Kiểm tra đăng ký, dashboard, chấm Reading, draft resume + đóng ngay trước autosave, Writing checklist, SRS, lịch sử, mục tiêu, placement và bố cục mobile. Nếu fail, runner giữ thư mục artifact và in vị trí để chẩn đoán.

Kiểm tra auth/quota, không lộ answer keys, chấm điểm và repeat exposure, cô lập dữ liệu, draft, SRS, đủ 36 câu diagnostic, checklist, audio ownership, opt-in sharing, prompt constraints và logout. AI provider thật cần key/network riêng; không tuyên bố đã gọi AI thành công khi chưa có key.

## Cấu trúc

```text
client/src/main.jsx     Các màn hình React và luồng học
client/src/styles.css   Giao diện responsive
client/src/api.js       HTTP client cùng origin
server/app.js           API, auth và quyền truy cập
server/db.js            SQLite schema
server/content.js       Ngân hàng nội dung gốc
server/adaptive.js      Bayesian Rasch diagnostic
server/prompts.js       Prompt registry từ báo cáo
server/ai.js            Provider abstraction / schema / checklist
test/api.test.js        Kiểm thử tích hợp backend
```

Không dùng logo/đề thi IELTS có bản quyền; IELTS là nhãn hiệu của chủ sở hữu tương ứng. Website là công cụ luyện tập độc lập.
