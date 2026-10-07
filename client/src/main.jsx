import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Headphones,
  PenLine,
  Mic,
  LayoutDashboard,
  CalendarDays,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  Sparkles,
  Flame,
  Check,
  ChevronRight,
  ChevronLeft,
  Clock,
  Target,
  GraduationCap,
  Menu,
  X,
  Play,
  Pause,
  Volume2,
  RotateCcw,
  Download,
  ShieldCheck,
  Plus,
  Search,
  LoaderCircle,
  TriangleAlert,
  Square,
  Trash2,
  Brain,
  CheckCircle2,
} from "lucide-react";
import { api, post, put } from "./api";
import "./styles.css";
const icons = {
  Listening: Headphones,
  Reading: BookOpen,
  Writing: PenLine,
  Speaking: Mic,
};
const labels = {
  paraphrase: "Nhận diện cách diễn đạt tương đương",
  NOT_GIVEN_as_FALSE: "Phân biệt False và Not Given",
  distractor: "Nhận diện thông tin gây nhiễu",
  numbers: "Nghe số & thời gian",
  inference: "Suy luận từ ngữ cảnh",
  detail: "Đọc/nghe chi tiết",
  under_word_limit: "Chưa đủ số từ",
};
const skillColors = {
  Listening: "lavender",
  Reading: "green",
  Writing: "peach",
  Speaking: "blue",
};
function Icon({ name, ...props }) {
  const C = icons[name] || BookOpen;
  return <C {...props} />;
}
function Button({ children, className = "", ...props }) {
  return (
    <button className={`button ${className}`} {...props}>
      {children}
    </button>
  );
}
function Empty({ title, children }) {
  return (
    <div className="empty">
      <GraduationCap size={32} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function App() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState("dashboard"),
    [data, setData] = useState(null),
    [lessons, setLessons] = useState([]),
    [health, setHealth] = useState({}),
    [active, setActive] = useState(null),
    [notice, setNotice] = useState(""),
    [mobile, setMobile] = useState(false);
  const notify = (msg) => setNotice(msg);
  async function refresh() {
    const [d, l] = await Promise.all([api("/dashboard"), api("/lessons")]);
    setData(d);
    setLessons(l);
  }
  useEffect(() => {
    Promise.all([api("/me").catch(() => null), api("/health")])
      .then(([u, h]) => {
        setUser(u);
        setHealth(h);
      })
      .catch(() => notify("Không thể kết nối server."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (user) refresh().catch((e) => notify(e.message));
  }, [user]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(t);
  }, [notice]);
  const navigate = (p) => {
    setPage(p);
    setMobile(false);
  };
  if (loading)
    return (
      <div className="boot">
        <LoaderCircle className="spin" /> Đang mở không gian học…
      </div>
    );
  if (!user) return <Auth onAuth={setUser} />;
  const nav = [
    ["dashboard", "Tổng quan", LayoutDashboard],
    ["practice", "Luyện tập", BookOpen],
    ["vocabulary", "Từ vựng", GraduationCap],
    ["plan", "Lộ trình học", CalendarDays],
    ["progress", "Tiến độ", ChartNoAxesCombined],
  ];
  return (
    <div className="app">
      <div
        className={`scrim ${mobile ? "visible" : ""}`}
        onClick={() => setMobile(false)}
      />
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("dashboard");
          }}
        >
          <span className="brand-mark">
            <BookOpen size={22} />
          </span>
          <span>
            IELTS<span className="brand-duo">duo</span>
            <small>YOUR PERSONAL LEARNING SPACE</small>
          </span>
        </a>
        <div className="space-badge">
          <span className="dot" /> KHÔNG GIAN CỦA HAI NGƯỜI
        </div>
        <p className="nav-label">KHÔNG GIAN HỌC TẬP</p>
        <nav>
          {nav.map(([key, label, C]) => (
            <button
              key={key}
              onClick={() => navigate(key)}
              className={`nav-item ${page === key ? "active" : ""}`}
            >
              <C size={20} />
              {label}
              {page === key && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="coach-card">
            <span className="coach-spark">
              <Sparkles size={21} />
            </span>
            <h3>
              Một chút mỗi ngày.
              <br />
              Một bước gần mục tiêu.
            </h3>
            <p>AI đồng hành theo cách học của riêng bạn.</p>
            <button onClick={() => navigate("ai")}>
              Khám phá AI Coach <ArrowUpRight size={16} />
            </button>
          </div>
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <Settings size={19} />
            Cài đặt tài khoản
          </button>
          <div className="sidebar-profile">
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <b>{user.name}</b>
              <small>
                {user.profile.testType} · Mục tiêu{" "}
                {user.profile.target.toFixed(1)}
              </small>
            </div>
            <button
              title="Đăng xuất"
              className="icon-button"
              onClick={async () => {
                await post("/auth/logout", {});
                setUser(null);
                setData(null);
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-toggle"
            onClick={() => setMobile(!mobile)}
            aria-label="Mở menu"
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Không gian học tập <ChevronRight size={14} />
            <b>
              {
                [
                  ...nav,
                  ["settings", "Cài đặt"],
                  ["ai", "AI Coach"],
                  ["placement", "Kiểm tra đầu vào"],
                ].find((n) => n[0] === page)?.[1]
              }
            </b>
          </div>
          <div className="topbar-right">
            <span className="estimated-label">
              <ShieldCheck size={15} /> Điểm luyện tập ước lượng
            </span>
            <span className="avatar small">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main>
          {data ? (
            <>
              {page === "dashboard" && (
                <Dashboard
                  user={user}
                  data={data}
                  navigate={navigate}
                  open={setActive}
                />
              )}
              {page === "practice" && (
                <Practice
                  lessons={lessons}
                  open={setActive}
                  navigate={navigate}
                />
              )}
              {page === "vocabulary" && (
                <Vocabulary notify={notify} refresh={refresh} />
              )}
              {page === "plan" && (
                <Plan
                  data={data}
                  user={user}
                  open={setActive}
                  navigate={navigate}
                />
              )}
              {page === "progress" && (
                <Progress data={data} navigate={navigate} />
              )}
              {page === "settings" && (
                <SettingsPage user={user} setUser={setUser} notify={notify} />
              )}
              {page === "ai" && (
                <AICoach health={health} user={user} notify={notify} />
              )}
              {page === "placement" && (
                <Placement
                  notify={notify}
                  refresh={refresh}
                  navigate={navigate}
                />
              )}
            </>
          ) : (
            <div className="loading-panel">
              <LoaderCircle className="spin" /> Đang tải dữ liệu học tập…
            </div>
          )}
        </main>
        <footer>
          Được thiết kế cho hành trình của riêng bạn.{" "}
          <span>IELTS Duo · Học bền vững, tiến bộ thật.</span>
        </footer>
      </div>
      {active && (
        <LessonModal
          key={active.id}
          lesson={active}
          health={health}
          notify={notify}
          close={() => setActive(null)}
          refresh={refresh}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {notice}
          <button
            className="icon-button"
            onClick={() => setNotice("")}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function Auth({ onAuth }) {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [codeRequired, setCodeRequired] = useState(false);
  useEffect(() => {
    api("/health")
      .then((h) => setCodeRequired(h.registrationCodeRequired))
      .catch(() => {});
  }, []);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.target);
    try {
      onAuth(
        await post(
          `/auth/${register ? "register" : "login"}`,
          Object.fromEntries(f),
        ),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth">
      <section className="auth-story">
        <div className="brand light">
          <span className="brand-mark">
            <BookOpen />
          </span>
          IELTS<span className="brand-duo">duo</span>
        </div>
        <span className="eyebrow">TWO LEARNERS. TWO UNIQUE JOURNEYS.</span>
        <h1>
          Học cùng nhau.
          <br />
          Tiến bộ theo
          <br />
          <em>cách riêng.</em>
        </h1>
        <p>
          Không gian luyện IELTS cá nhân hóa, nơi từng bài học đưa bạn gần hơn
          với mục tiêu.
        </p>
        <div className="auth-visual">
          <div className="auth-orbit">
            <GraduationCap size={55} />
          </div>
          <span className="float-label one">
            <Sparkles size={16} /> Lộ trình của riêng bạn
          </span>
          <span className="float-label two">
            <CheckCircle2 size={16} /> Bốn kỹ năng · Một mục tiêu
          </span>
        </div>
        <small>
          Nội dung luyện tập gốc · Phản hồi có căn cứ · Dữ liệu riêng tư
        </small>
      </section>
      <section className="auth-form">
        <div>
          <span className="eyebrow">CHÀO MỪNG ĐẾN KHÔNG GIAN CỦA BẠN</span>
          <h2>
            {register ? "Bắt đầu hành trình mới" : "Rất vui được gặp lại bạn."}
          </h2>
          <p>
            {register
              ? "Tạo một trong hai tài khoản học tập độc lập."
              : "Đăng nhập để tiếp tục từ nơi bạn đã dừng."}
          </p>
          <form onSubmit={submit}>
            {register && (
              <label>
                Tên của bạn
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={60}
                  placeholder="Tên bạn muốn được gọi"
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                placeholder="ban@example.com"
                autoComplete="email"
              />
            </label>
            <label>
              Mật khẩu
              <input
                name="password"
                type="password"
                required
                minLength={register ? 10 : 1}
                maxLength={128}
                placeholder={register ? "Ít nhất 10 ký tự" : "Nhập mật khẩu"}
                autoComplete={register ? "new-password" : "current-password"}
              />
            </label>
            {register && codeRequired && (
              <label>
                Mã tham gia
                <input
                  name="registrationCode"
                  required
                  type="password"
                  placeholder="Mã từ chủ không gian học"
                  autoComplete="off"
                />
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button className="primary full" disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <>
                  {register ? "Tạo tài khoản" : "Vào không gian học"}
                  <ArrowRight size={18} />
                </>
              )}
            </Button>
          </form>
          <p className="auth-switch">
            {register ? "Đã có tài khoản?" : "Lần đầu đến đây?"}{" "}
            <button
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "Đăng nhập" : "Tạo tài khoản"}
            </button>
          </p>
          <div className="privacy-note">
            <ShieldCheck size={18} />
            Bài làm, bản nháp và tiến độ thuộc riêng tài khoản của bạn.
          </div>
        </div>
      </section>
    </div>
  );
}
function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
function Dashboard({ user, data, navigate, open }) {
  const date = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const bandScores = data.skillStats.filter((s) => s.band != null),
    overall =
      bandScores.length === 4
        ? Math.round((bandScores.reduce((a, s) => a + s.band, 0) / 4) * 2) / 2
        : null;
  const completed = data.plan.filter((t) => t.completed).length;
  return (
    <>
      <PageHeading
        eyebrow={date.toUpperCase()}
        title={`Chào ${user.name.split(" ").at(-1)}, cùng tiến bộ nhé 👋`}
        description="Mỗi bước nhỏ hôm nay đều có ý nghĩa cho hành trình phía trước."
      >
        <Button className="outline" onClick={() => navigate("plan")}>
          <CalendarDays size={17} /> Lộ trình của tôi
        </Button>
      </PageHeading>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="hero">
            <div className="hero-copy">
              <span className="hero-badge">
                <Sparkles size={14} /> YOUR NEXT CHAPTER
              </span>
              <h2>
                Mục tiêu lớn.
                <br />
                Bắt đầu từ <em>hôm nay.</em>
              </h2>
              <p>
                {data.attempts.length
                  ? "Tiếp tục xây nền tảng vững chắc với các bài luyện dành cho bạn."
                  : "Tìm hiểu điểm xuất phát của bạn để xây dựng lộ trình học phù hợp."}
              </p>
              <Button
                className="hero-button"
                onClick={() =>
                  navigate(data.baseline.length ? "practice" : "placement")
                }
              >
                {data.baseline.length
                  ? "Bắt đầu luyện tập"
                  : "Kiểm tra trình độ đầu vào"}
                <ArrowRight size={18} />
              </Button>
              <small>
                <Clock size={13} />{" "}
                {data.baseline.length
                  ? "Một bài học nhỏ, một bước tiến mới"
                  : "36 câu Reading & Listening · Có thể tiếp tục sau"}
              </small>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="hero-book">
                <BookOpen size={69} strokeWidth={1} />
              </div>
              <span className="art-chip chip-target">
                <Target size={17} />
                <span>
                  YOUR GOAL<b>Band {user.profile.target.toFixed(1)}</b>
                </span>
              </span>
              <span className="art-chip chip-growth">
                <ChartNoAxesCombined size={20} /> A little better, every day
              </span>
              <span className="art-star">✦</span>
              <span className="art-star second">✧</span>
            </div>
          </section>
          <section className="section">
            <div className="section-title">
              <div>
                <h2>Bốn kỹ năng, một hành trình</h2>
                <p>Điểm ước lượng từ bài kiểm tra và bài làm của bạn</p>
              </div>
              <button
                className="text-link"
                onClick={() => navigate("progress")}
              >
                Chi tiết <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="skill-grid">
              {data.skillStats.map((s) => (
                <button
                  className={`skill-card ${skillColors[s.skill]}`}
                  key={s.skill}
                  onClick={() => navigate("practice")}
                >
                  <div className="skill-top">
                    <span className="skill-icon">
                      <Icon name={s.skill} size={20} />
                    </span>
                    <ArrowUpRight size={16} />
                  </div>
                  <h3>{s.skill}</h3>
                  <div className="band-number">
                    {s.band != null
                      ? (Math.round(s.band * 2) / 2).toFixed(1)
                      : "—"}
                    <small> / 9.0</small>
                  </div>
                  <div className="skill-line">
                    <span style={{ width: `${((s.band || 0) / 9) * 100}%` }} />
                  </div>
                  <p>
                    {s.band != null
                      ? "Ước lượng luyện tập"
                      : "Chưa có dữ liệu đánh giá"}
                  </p>
                </button>
              ))}
            </div>
          </section>
          <section className="section">
            <div className="section-title">
              <div>
                <h2>Hôm nay, học gì?</h2>
                <p>Đủ tập trung. Vừa sức. Đúng hướng.</p>
              </div>
              <span className="subtle-badge">
                {completed}/{data.plan.length} hoàn thành
              </span>
            </div>
            <div className="task-list">
              {data.plan.map((t, i) => (
                <TaskRow key={t.id} task={t} index={i} open={open} />
              ))}
            </div>
          </section>
          <div className="reflection">
            <span className="reflection-icon">
              <Brain size={23} />
            </span>
            <div>
              <h3>Tiến bộ bắt đầu khi bạn hiểu lỗi của mình.</h3>
              <p>
                {data.topErrors.length
                  ? `Ưu tiên hôm nay: ${labels[data.topErrors[0][0]] || data.topErrors[0][0]}.`
                  : "Hoàn thành bài luyện đầu tiên để khám phá những điểm cần cải thiện."}
              </p>
            </div>
            <button
              className="icon-button"
              onClick={() => navigate("progress")}
              aria-label="Xem lỗi thường gặp"
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
        <aside className="dashboard-side">
          <section className="panel goal-panel">
            <div className="section-title">
              <h3>Đích đến của bạn</h3>
              <Target size={18} />
            </div>
            <div
              className="goal-ring"
              style={{
                "--progress": `${((overall || 0) / user.profile.target) * 100}%`,
              }}
            >
              <div>
                <span>MỤC TIÊU IELTS</span>
                <b>{user.profile.target.toFixed(1)}</b>
                <small>{user.profile.testType}</small>
              </div>
            </div>
            <div className="goal-foot">
              <span>Ước lượng hiện tại</span>
              <b>{overall?.toFixed(1) || "Chưa đủ dữ liệu"}</b>
            </div>
            <div className="goal-foot">
              <span>Ngày thi dự kiến</span>
              <b>
                {user.profile.examDate
                  ? new Intl.DateTimeFormat("vi-VN").format(
                      new Date(user.profile.examDate),
                    )
                  : "Chưa đặt lịch"}
              </b>
            </div>
            <button className="text-link" onClick={() => navigate("settings")}>
              Điều chỉnh mục tiêu <ArrowRight size={14} />
            </button>
          </section>
          <section className="panel weekly-panel">
            <div className="section-title">
              <h3>Nhịp học tuần này</h3>
              <span className="mini-icon">
                <Flame size={17} />
              </span>
            </div>
            <div className="weekly-number">
              {data.weeklyMinutes}
              <span> / {user.profile.dailyMinutes * 7} phút</span>
            </div>
            <div className="weekly-bars">
              {data.weeklyActivity.map((d, i) => (
                <div key={d.date}>
                  <div className="bar-track">
                    <span
                      style={{
                        height: `${Math.max(3, Math.min(100, (d.minutes / user.profile.dailyMinutes) * 100))}%`,
                      }}
                      className={i === 6 ? "today" : ""}
                    />
                  </div>
                  <small>
                    {new Intl.DateTimeFormat("vi-VN", { weekday: "short" })
                      .format(new Date(d.date))
                      .replace("Th ", "T")}
                  </small>
                </div>
              ))}
            </div>
            <p>
              <span className="dot" /> Một khoảng thời gian nhỏ, đều đặn mỗi
              ngày.
            </p>
          </section>
          <section className="vocab-promo">
            <span className="vocab-decoration">Aa</span>
            <span className="eyebrow">GHI NHỚ LÂU HƠN</span>
            <h3>
              Từ quen.
              <br />
              Dùng thật.
            </h3>
            <p>
              <b>{data.vocabulary.due} từ</b> đang chờ bạn ôn tập.
            </p>
            <Button className="white" onClick={() => navigate("vocabulary")}>
              Ôn từ vựng <ArrowRight size={16} />
            </Button>
          </section>
          {data.peers.length > 0 && (
            <section className="panel">
              <h3>Cùng nhau tiến bộ</h3>
              {data.peers.map((p) => (
                <p key={p.name}>
                  {p.name}: {p.weeklyMinutes} phút tuần này
                </p>
              ))}
              <small>Cả hai đã đồng ý chia sẻ tiến độ tổng hợp.</small>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
function TaskRow({ task, index, open }) {
  return (
    <button
      className={`task-row ${task.completed ? "done" : ""}`}
      onClick={() => open(task)}
    >
      <span className={`task-icon ${skillColors[task.skill]}`}>
        <Icon name={task.skill} size={21} />
      </span>
      <div className="task-copy">
        <span className="eyebrow">
          {task.skill} <span>· {task.type}</span>
        </span>
        <h3>{task.title}</h3>
        <p>
          <Clock size={13} />
          {task.minutes} phút <span>·</span> Band {task.band.toFixed(1)}
        </p>
      </div>
      <span className="task-action">
        {task.completed ? (
          <>
            <Check size={16} />
            Đã học
          </>
        ) : (
          <>
            <span className="task-step">0{index + 1}</span>
            <ChevronRight size={19} />
          </>
        )}
      </span>
    </button>
  );
}
function Practice({ lessons, open, navigate }) {
  const [skill, setSkill] = useState("Tất cả"),
    [search, setSearch] = useState("");
  const filtered = lessons.filter(
    (l) =>
      (skill === "Tất cả" || l.skill === skill) &&
      `${l.title} ${l.topic} ${l.subtitle}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="PRACTICE, WITH PURPOSE"
        title="Mỗi bài luyện, một bước tiến."
        description="Nội dung gốc, bốn kỹ năng. Chọn bài phù hợp với mục tiêu của bạn."
      >
        <Button className="outline" onClick={() => navigate("placement")}>
          <Target size={17} /> Kiểm tra đầu vào
        </Button>
      </PageHeading>
      <div className="filter-row">
        <div className="tabs">
          {["Tất cả", ...Object.keys(icons)].map((s) => (
            <button
              className={skill === s ? "selected" : ""}
              onClick={() => setSkill(s)}
              key={s}
            >
              {s}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Tìm bài luyện"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm chủ đề, bài luyện…"
          />
        </label>
      </div>
      <div className="lesson-grid">
        {filtered.map((l) => (
          <button className="lesson-card" key={l.id} onClick={() => open(l)}>
            <div className={`lesson-art ${skillColors[l.skill]}`}>
              <Icon name={l.skill} size={48} strokeWidth={1.3} />
              <span>{l.skill.toUpperCase()}</span>
              <b>0{lessons.indexOf(l) + 1}</b>
            </div>
            <div className="lesson-body">
              <span className="eyebrow">
                {l.topic} · Band {l.band.toFixed(1)}
              </span>
              <h3>{l.title}</h3>
              <p>{l.subtitle}</p>
              <div className="lesson-bottom">
                <span>
                  <Clock size={14} />
                  {l.minutes} phút
                </span>
                <ArrowUpRight size={18} />
              </div>
            </div>
          </button>
        ))}
      </div>
      {!filtered.length && (
        <Empty title="Chưa tìm thấy bài luyện">
          Thử một từ khóa hoặc kỹ năng khác.
        </Empty>
      )}
      <div className="note">
        <ShieldCheck size={18} />
        Các bài luyện ngắn dùng để rèn kỹ năng, không thay thế đề thi IELTS đầy
        đủ. Audio dùng giọng tổng hợp của trình duyệt.
      </div>
    </>
  );
}
function Vocabulary({ notify, refresh }) {
  const [words, setWords] = useState([]),
    [index, setIndex] = useState(0),
    [flip, setFlip] = useState(false),
    [busy, setBusy] = useState(false),
    [onlyDue, setOnlyDue] = useState(true),
    [graded, setGraded] = useState(0);
  const load = () =>
    api("/vocabulary")
      .then(setWords)
      .catch((e) => notify(e.message));
  useEffect(() => {
    load();
  }, []);
  const filtered = onlyDue
    ? words.filter((w) => !w.review || w.review.due <= new Date().toISOString())
    : words;
  const word = filtered[index % Math.max(1, filtered.length)];
  async function review(remembered) {
    setBusy(true);
    try {
      await post(`/vocabulary/${word.id}/review`, { remembered });
      setFlip(false);
      setGraded((n) => n + 1);
      if (!onlyDue) setIndex((n) => n + 1);
      await load();
      await refresh();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="SMALL WORDS. BIG POSSIBILITIES."
        title="Từ vựng để dùng, không chỉ để nhớ."
        description="Ôn tập ngắt quãng, collocation hữu ích và những lỗi người Việt thường gặp."
      />
      <div className="filter-row">
        <div className="tabs">
          <button
            className={onlyDue ? "selected" : ""}
            onClick={() => {
              setOnlyDue(true);
              setIndex(0);
              setFlip(false);
            }}
          >
            Đến hạn ôn (
            {
              words.filter(
                (w) => !w.review || w.review.due <= new Date().toISOString(),
              ).length
            }
            )
          </button>
          <button
            className={!onlyDue ? "selected" : ""}
            onClick={() => {
              setOnlyDue(false);
              setIndex(0);
              setFlip(false);
            }}
          >
            Toàn bộ ({words.length})
          </button>
        </div>
        <span className="muted">Đã ôn phiên này: {graded}</span>
      </div>
      {word ? (
        <div className="flashcard-layout">
          <div className="flashcard">
            <div className="flashcard-top">
              <span className="subtle-badge">
                {word.pos} · Ước lượng cấp độ {word.level}
              </span>
              <button
                className="icon-button"
                aria-label="Nghe từ"
                onClick={() => speak(word.lemma, notify)}
              >
                <Volume2 size={21} />
              </button>
            </div>
            <span className="eyebrow">THỬ NHỚ NGHĨA VÀ MỘT COLLOCATION</span>
            <h2>{word.lemma}</h2>
            {flip ? (
              <div className="word-reveal">
                <h3>{word.gloss}</h3>
                <p>{word.definition}</p>
                <div className="collocation">{word.collocation}</div>
                <blockquote>“{word.example}”</blockquote>
                <p className="word-error">
                  <TriangleAlert size={16} />
                  {word.error}
                </p>
                <small>Word family: {word.family}</small>
              </div>
            ) : (
              <p className="word-placeholder">
                Bạn có thể dùng từ này trong một câu không?
              </p>
            )}
            <Button className="outline" onClick={() => setFlip(!flip)}>
              <RotateCcw size={16} />
              {flip ? "Ẩn nghĩa" : "Lật thẻ · Xem nghĩa"}
            </Button>
            {flip && (
              <div className="review-buttons">
                <Button
                  disabled={busy}
                  onClick={() => review(false)}
                  className="outline"
                >
                  Cần ôn lại · 10 phút
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => review(true)}
                  className="primary"
                >
                  <Check size={17} />
                  Đã nhớ
                </Button>
              </div>
            )}
          </div>
          <section className="panel srs-explainer">
            <span className="big-icon">
              <Brain size={28} />
            </span>
            <h3>Nhớ lâu theo nhịp của bạn.</h3>
            <p>
              Nhớ đúng: khoảng ôn tăng dần 1 → 2 → 4 → 8 ngày. Chưa nhớ: quay
              lại sau 10 phút.
            </p>
            <p>
              Thử tự đặt câu trước khi lật thẻ. Học từ trong ngữ cảnh giúp bạn
              dùng chúng tự nhiên hơn.
            </p>
            <div className="note">
              Cấp độ là ước lượng giảng dạy, không phải phân loại từ vựng IELTS
              chính thức.
            </div>
          </section>
        </div>
      ) : (
        <Empty title="Bạn đã ôn hết các từ đến hạn 🎉">
          Quay lại khi đến lịch ôn tiếp theo hoặc xem toàn bộ từ vựng.
        </Empty>
      )}
    </>
  );
}
function Plan({ data, user, open, navigate }) {
  return (
    <>
      <PageHeading
        eyebrow="YOUR ROADMAP"
        title="Một lộ trình vừa sức với bạn."
        description={`Mục tiêu ${user.profile.target.toFixed(1)} · ${user.profile.testType} · ${user.profile.dailyMinutes} phút mỗi ngày`}
      />
      <div className="plan-intro">
        <div>
          <span className="eyebrow">HÔM NAY</span>
          <h2>Xây nền tảng. Hiểu lỗi. Thử lại.</h2>
          <p>
            Lộ trình ưu tiên Reading, nghe chi tiết và phát triển ý viết. Khi có
            lỗi lặp lại, bài Reading sẽ điều chỉnh theo lỗi của bạn.
          </p>
        </div>
        <div className="plan-time">
          <Clock size={26} />
          <b>{data.plan.reduce((s, t) => s + t.minutes, 0)}</b>
          <span>phút bài luyện gợi ý</span>
        </div>
      </div>
      <div className="task-list">
        {data.plan.map((t, i) => (
          <TaskRow key={t.id} task={t} index={i} open={open} />
        ))}
      </div>
      <div className="roadmap">
        <section className="panel">
          <span className="eyebrow">01 · ĐIỂM XUẤT PHÁT</span>
          <h3>Chẩn đoán Reading & Listening</h3>
          <p>
            36 câu thích ứng, 18 câu mỗi kỹ năng. Ước lượng có khoảng bất định.
          </p>
          <Button className="outline" onClick={() => navigate("placement")}>
            Làm kiểm tra <ArrowRight size={16} />
          </Button>
        </section>
        <section className="panel">
          <span className="eyebrow">02 · LUYỆN CÓ CHỦ ĐÍCH</span>
          <h3>Tập trung vào điểm còn thiếu</h3>
          <p>
            Làm bài, đọc bằng chứng đáp án và tự sửa. Ôn từ theo lịch mỗi ngày.
          </p>
          <Button className="outline" onClick={() => navigate("practice")}>
            Chọn bài luyện <ArrowRight size={16} />
          </Button>
        </section>
        <section className="panel">
          <span className="eyebrow">03 · NHÌN LẠI TIẾN BỘ</span>
          <h3>Đo sự thay đổi, không chỉ số lượng</h3>
          <p>
            Theo dõi độ chính xác, rubric và lỗi lặp lại. Bài đã gặp được đánh
            dấu riêng.
          </p>
          <Button className="outline" onClick={() => navigate("progress")}>
            Xem tiến độ <ArrowRight size={16} />
          </Button>
        </section>
      </div>
    </>
  );
}
function Progress({ data, navigate }) {
  return (
    <>
      <PageHeading
        eyebrow="PROGRESS OVER PERFECTION"
        title="Nhìn lại để đi xa hơn."
        description="Dữ liệu từ những bài bạn thực sự hoàn thành. Chưa có dữ liệu sẽ được để trống."
      >
        <a className="button outline" href="/api/export">
          <Download size={17} /> Xuất dữ liệu của tôi
        </a>
      </PageHeading>
      <div className="stat-grid">
        <section className="panel">
          <span className="eyebrow">BÀI ĐÃ HOÀN THÀNH</span>
          <b className="stat-value">
            {data.skillStats.reduce((n, s) => n + s.count, 0)}
          </b>
        </section>
        <section className="panel">
          <span className="eyebrow">THỜI GIAN TUẦN NÀY</span>
          <b className="stat-value">
            {data.weeklyMinutes}
            <small> phút</small>
          </b>
        </section>
        <section className="panel">
          <span className="eyebrow">TỪ VỰNG ĐÃ ÔN</span>
          <b className="stat-value">
            {data.vocabulary.reviewed}
            <small> / 12 từ</small>
          </b>
        </section>
      </div>
      <div className="two-columns">
        <section className="panel">
          <h3>Độ chính xác theo kỹ năng</h3>
          {data.skillStats.map((s) => (
            <div className="accuracy-row" key={s.skill}>
              <span>
                <Icon name={s.skill} size={17} />
                {s.skill}
              </span>
              <div className="accuracy-track">
                <i style={{ width: `${s.accuracy || 0}%` }} />
              </div>
              <b>{s.accuracy != null ? `${s.accuracy}%` : "—"}</b>
            </div>
          ))}
          <p className="muted">
            Writing/Speaking sử dụng rubric thay vì tỷ lệ câu đúng.
          </p>
        </section>
        <section className="panel">
          <h3>Ba điểm cần chú ý</h3>
          {data.topErrors.length ? (
            data.topErrors.map(([tag, n]) => (
              <div className="error-row" key={tag}>
                <span>
                  <TriangleAlert size={17} />
                  {labels[tag] || tag}
                </span>
                <b>{n} lần</b>
              </div>
            ))
          ) : (
            <p className="muted">
              Lỗi sẽ xuất hiện khi bạn hoàn thành bài luyện.
            </p>
          )}
        </section>
      </div>
      <section className="section">
        <div className="section-title">
          <h2>Lịch sử học tập</h2>
          <button className="text-link" onClick={() => navigate("practice")}>
            Luyện thêm <ArrowUpRight size={16} />
          </button>
        </div>
        {data.attempts.length ? (
          <div className="history-table">
            <table>
              <thead>
                <tr>
                  <th>Bài luyện</th>
                  <th>Kỹ năng</th>
                  <th>Kết quả</th>
                  <th>Thời gian</th>
                  <th>Ngày</th>
                </tr>
              </thead>
              <tbody>
                {data.attempts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {a.lesson_id.toUpperCase()}{" "}
                      {a.result.repeated && (
                        <span className="subtle-badge">Đã gặp</span>
                      )}
                    </td>
                    <td>{a.skill}</td>
                    <td>
                      {a.result.total
                        ? `${a.result.correct}/${a.result.total}`
                        : a.result.estimated_band != null
                          ? `Ước lượng ${a.result.estimated_band.toFixed(1)}`
                          : "Checklist / chưa có band"}
                    </td>
                    <td>{a.minutes} phút</td>
                    <td>{new Date(a.created).toLocaleDateString("vi-VN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Trang đầu tiên đang chờ bạn">
            Hoàn thành một bài luyện để bắt đầu ghi lại hành trình.
          </Empty>
        )}
      </section>
      <div className="note">
        <ShieldCheck size={18} />
        Band từ AI hoặc chẩn đoán là ước lượng luyện tập. Ngân hàng chẩn đoán
        chưa được hiệu chỉnh bởi giám khảo, không dùng cho quyết định thi chính
        thức.
      </div>
    </>
  );
}
function SettingsPage({ user, setUser, notify }) {
  const [p, setP] = useState(user.profile),
    [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      setUser(await put("/profile", p));
      notify("Đã lưu mục tiêu và sở thích học tập.");
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE IT YOURS"
        title="Hành trình của bạn, lựa chọn của bạn."
        description="Hai tài khoản độc lập. Chỉ chia sẻ tiến độ tổng hợp khi cả hai đồng ý."
      />
      <form className="panel settings-form" onSubmit={save}>
        <h3>Mục tiêu học tập</h3>
        <div className="form-grid">
          <label>
            Loại bài thi
            <select
              value={p.testType}
              onChange={(e) => setP({ ...p, testType: e.target.value })}
            >
              <option>Academic</option>
              <option>General Training</option>
            </select>
          </label>
          <label>
            Band mục tiêu
            <select
              value={p.target}
              onChange={(e) => setP({ ...p, target: Number(e.target.value) })}
            >
              {Array.from({ length: 13 }, (_, i) => 3 + i * 0.5).map((n) => (
                <option value={n} key={n}>
                  {n.toFixed(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ngày thi dự kiến
            <input
              type="date"
              value={p.examDate}
              onChange={(e) => setP({ ...p, examDate: e.target.value })}
            />
          </label>
          <label>
            Thời gian học mỗi ngày (phút)
            <input
              type="number"
              min="10"
              max="180"
              value={p.dailyMinutes}
              onChange={(e) =>
                setP({ ...p, dailyMinutes: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={p.shareProgress}
            onChange={(e) => setP({ ...p, shareProgress: e.target.checked })}
          />
          <div>
            <b>Chia sẻ nhịp học với người đồng hành</b>
            <p>
              Chỉ tên và tổng phút học tuần này. Cần cả hai cùng bật; không chia
              sẻ bài làm hay bản ghi.
            </p>
          </div>
        </label>
        <Button className="primary" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu thay đổi"}
          <Check size={17} />
        </Button>
        <div className="note">
          <ShieldCheck size={18} />
          Email: {user.email}. API key được cấu hình trên server, không nhập
          trong giao diện và không lưu vào Git.
        </div>
      </form>
    </>
  );
}
function AICoach({ health, user, notify }) {
  const [skill, setSkill] = useState("Reading"),
    [topic, setTopic] = useState("Urban sustainability"),
    [band, setBand] = useState(5.5),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(null),
    [history, setHistory] = useState([]);
  const loadHistory = () =>
    api("/ai/generated")
      .then(setHistory)
      .catch((e) => notify(e.message));
  useEffect(() => {
    loadHistory();
  }, []);
  async function generate(e) {
    e.preventDefault();
    setBusy(true);
    try {
      setResult(
        await post("/ai/generate", {
          skill,
          band,
          topic,
          mode: user.profile.testType,
        }),
      );
      await loadHistory();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="AI AS A COACH, NOT AN ORACLE"
        title="Luyện đúng điều bạn cần."
        description="Sáu nhóm prompt từ tài liệu nghiên cứu, được quản lý phiên bản phía server."
      />
      <div className={`note ${!health.aiConfigured ? "warning" : ""}`}>
        <Sparkles size={19} />
        {health.aiConfigured
          ? "AI đã được cấu hình. Nội dung sinh ra cần người kiểm duyệt trước khi dùng làm đề."
          : "AI chưa được kết nối. Quản trị viên cần đặt AI_API_KEY trong file .env trên server. Các bài luyện và checklist vẫn hoạt động."}
      </div>
      <form className="panel settings-form" onSubmit={generate}>
        <h3>Tạo bản nháp nội dung gốc</h3>
        <div className="form-grid">
          <label>
            Nhóm prompt
            <select value={skill} onChange={(e) => setSkill(e.target.value)}>
              {[
                "Reading",
                "Listening",
                "Writing",
                "Speaking",
                "Vocabulary",
                "Placement",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Band luyện tập
            <input
              type="number"
              min="3"
              max="7"
              step="0.5"
              value={band}
              onChange={(e) => setBand(Number(e.target.value))}
            />
          </label>
        </div>
        <label>
          Chủ đề
          <input
            required
            minLength={2}
            maxLength={100}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>
        <Button className="primary" disabled={busy || !health.aiConfigured}>
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <Sparkles size={18} />
          )}{" "}
          {busy ? "Đang tạo và kiểm tra…" : "Tạo nội dung"}
        </Button>
      </form>
      {history.length > 0 && (
        <section className="panel generated">
          <h3>Bản nháp đã lưu</h3>
          {history.map((h) => (
            <button
              className="draft-history-row"
              key={h.id}
              onClick={() =>
                api(`/ai/generated/${h.id}`)
                  .then(setResult)
                  .catch((e) => notify(e.message))
              }
            >
              <span>
                {h.skill} · {new Date(h.created).toLocaleString("vi-VN")}
              </span>
              <span className="subtle-badge">Cần kiểm duyệt</span>
              <ChevronRight size={17} />
            </button>
          ))}
        </section>
      )}
      {result && (
        <section className="panel generated">
          <span className="subtle-badge">
            Cần người kiểm duyệt · {result.promptVersion}
          </span>
          <h3>Bản nháp AI</h3>
          <p>
            Chưa đưa vào ngân hàng bài thi. Kiểm tra cấu trúc, bằng chứng đáp
            án, độ khó và tính mơ hồ.
          </p>
          <pre>{JSON.stringify(result.body, null, 2)}</pre>
        </section>
      )}
    </>
  );
}
function speak(text, notify, onEnd) {
  if (!("speechSynthesis" in window)) {
    notify("Trình duyệt chưa hỗ trợ đọc audio.");
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-GB";
  u.rate = 0.9;
  u.onend = () => onEnd?.();
  u.onerror = () => {
    notify("Không phát được audio. Kiểm tra giọng đọc của trình duyệt.");
    onEnd?.();
  };
  window.speechSynthesis.speak(u);
}
function Placement({ notify, refresh, navigate }) {
  const [state, setState] = useState(null),
    [answer, setAnswer] = useState(""),
    [busy, setBusy] = useState(false),
    [played, setPlayed] = useState(false);
  useEffect(() => {
    post("/placement", {})
      .then(setState)
      .catch((e) => notify(e.message));
    return () => window.speechSynthesis?.cancel();
  }, []);
  async function submit() {
    setBusy(true);
    try {
      const s = await post(`/placement/${state.id}/answer`, {
        itemId: state.item.id,
        answer,
      });
      setState(s);
      setAnswer("");
      setPlayed(false);
      if (s.finished) await refresh();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="FIND YOUR STARTING POINT"
        title="Hiểu mình trước khi bắt đầu."
        description="18 câu Reading + 18 câu Listening. Câu tiếp theo điều chỉnh theo năng lực ước lượng."
      />
      {!state ? (
        <div className="loading-panel">
          <LoaderCircle className="spin" />
          Đang chuẩn bị…
        </div>
      ) : state.finished ? (
        <section className="panel placement-results">
          <span className="big-icon">
            <CheckCircle2 size={32} />
          </span>
          <h2>Đã tìm thấy điểm xuất phát.</h2>
          <div className="two-columns">
            {state.results.map((s) => (
              <div className="diagnostic-score" key={s.skill}>
                <Icon name={s.skill} />
                <h3>{s.skill}</h3>
                <b>
                  {s.estimate.toFixed(1)} <small>± {s.range.toFixed(1)}</small>
                </b>
                <p>
                  {s.correct}/{s.count} câu đúng · Khoảng bất định 95%
                </p>
              </div>
            ))}
          </div>
          <p className="note">
            Độ khó do tác giả gán; chưa được hiệu chỉnh tâm trắc. Đây là chẩn
            đoán định hướng, không phải IELTS band chính thức. Writing/Speaking
            cần bài mẫu riêng.
          </p>
          <Button className="primary" onClick={() => navigate("plan")}>
            Xem lộ trình học <ArrowRight size={17} />
          </Button>
        </section>
      ) : (
        <section className="panel placement-panel">
          <div className="section-title">
            <span className="subtle-badge">
              {state.item.skill} · Câu {state.answered + 1}/{state.total}
            </span>
            <span className="muted">Đã lưu tự động</span>
          </div>
          <div className="progress-track">
            <span
              style={{ width: `${(state.answered / state.total) * 100}%` }}
            />
          </div>
          {state.item.skill === "Reading" ? (
            <div className="passage">{state.item.text}</div>
          ) : (
            <div className="audio-box">
              <Headphones size={32} />
              <div>
                <h3>Nghe thông báo và chọn đáp án</h3>
                <p>
                  Giọng tổng hợp · Có thể nghe lại trong chẩn đoán thử nghiệm
                </p>
              </div>
              <Button
                className="primary"
                onClick={() => {
                  setPlayed(true);
                  speak(state.item.text, notify);
                }}
              >
                <Play size={16} />
                {played ? "Nghe lại" : "Phát audio"}
              </Button>
            </div>
          )}
          <h3>{state.item.question}</h3>
          <div className="answer-options">
            {state.item.options.map((o) => (
              <label className={answer === o ? "chosen" : ""} key={o}>
                <input
                  type="radio"
                  name="diagnostic-answer"
                  value={o}
                  checked={answer === o}
                  onChange={() => setAnswer(o)}
                />
                {o}
              </label>
            ))}
          </div>
          <Button
            className="primary"
            disabled={
              !answer || busy || (state.item.skill === "Listening" && !played)
            }
            onClick={submit}
          >
            Câu tiếp theo <ArrowRight size={17} />
          </Button>
          <p className="muted">
            Có thể rời trang và quay lại; câu trả lời đã nộp được lưu trên
            server.
          </p>
        </section>
      )}
    </>
  );
}
function LessonModal({ lesson, health, notify, close, refresh }) {
  const [mode, setMode] = useState("practice"),
    [answers, setAnswers] = useState({}),
    [text, setText] = useState(""),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(null),
    [transcript, setTranscript] = useState(false),
    [audioPlayed, setAudioPlayed] = useState(false),
    [playing, setPlaying] = useState(false),
    [remaining, setRemaining] = useState(lesson.minutes * 60),
    [paused, setPaused] = useState(false),
    [saveState, setSaveState] = useState(""),
    [useAI, setUseAI] = useState(false),
    [recording, setRecording] = useState(false),
    [recordings, setRecordings] = useState([]),
    [recordUrl, setRecordUrl] = useState("");
  const dialog = useRef(null);
  const draftState = useRef({ text: "", loaded: false });
  const saveQueue = useRef(Promise.resolve());
  const closing = useRef(false);
  const dirty = useRef(false);
  draftState.current = { text, loaded };
  function saveDraft(body) {
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(() => put(`/drafts/${lesson.id}`, { body }));
    return saveQueue.current;
  }
  async function closeSession() {
    if (closing.current) return;
    closing.current = true;
    try {
      if (!lesson.questions && draftState.current.loaded && dirty.current)
        await saveDraft(draftState.current.text);
      close();
    } catch (e) {
      closing.current = false;
      notify(
        "Chưa lưu được bản nháp. Kiểm tra kết nối rồi đóng lại để bảo toàn bài viết.",
      );
    }
  }
  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector("button")?.focus();
    function keys(e) {
      if (e.key === "Escape") {
        closeSession();
        return;
      }
      if (e.key === "Tab") {
        const els = [
          ...dialog.current.querySelectorAll(
            "button:not(:disabled),a[href],input:not(:disabled),select,textarea,audio[controls]",
          ),
        ];
        if (!els.length) return;
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", keys);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", keys);
      previous?.focus();
    };
  }, []);
  const recorder = useRef(null),
    stream = useRef(null),
    recordTimer = useRef(null),
    elapsed = useRef(0);
  useEffect(() => {
    api(`/drafts/${lesson.id}`)
      .then((d) => {
        setText(d.body);
        setLoaded(true);
      })
      .catch((e) => {
        notify(e.message);
      });
    if (lesson.skill === "Speaking") loadRecordings();
    return () => {
      window.speechSynthesis?.cancel();
      clearTimeout(recordTimer.current);
      recorder.current?.state === "recording" && recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    if (!loaded || lesson.questions || !dirty.current) return;
    setSaveState("Đang lưu…");
    const t = setTimeout(
      () =>
        saveDraft(text)
          .then(() => {
            if (draftState.current.text === text)
              setSaveState("Đã lưu bản nháp");
          })
          .catch(() => setSaveState("Chưa lưu được — kiểm tra kết nối")),
      900,
    );
    return () => clearTimeout(t);
  }, [text, loaded]);
  useEffect(() => {
    if (paused || result) return;
    const id = setInterval(() => {
      elapsed.current++;
      setRemaining((n) => Math.max(0, n - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [paused, result]);
  useEffect(() => {
    if (!recordUrl) return;
    return () => URL.revokeObjectURL(recordUrl);
  }, [recordUrl]);
  async function loadRecordings() {
    try {
      setRecordings(
        (await api("/recordings")).filter((r) => r.lesson_id === lesson.id),
      );
    } catch (e) {
      notify(e.message);
    }
  }
  async function submit(e) {
    e?.preventDefault();
    setBusy(true);
    try {
      if (!lesson.questions) await saveDraft(text);
      const r = await post("/attempts", {
        lessonId: lesson.id,
        answers,
        text,
        minutes: Math.min(120, Math.max(1, Math.ceil(elapsed.current / 60))),
        useAI,
        mode,
      });
      setResult(r);
      window.speechSynthesis?.cancel();
      await refresh();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  function play() {
    if (mode === "exam" && audioPlayed) return;
    setAudioPlayed(true);
    setPlaying(true);
    speak(lesson.text, notify, () => setPlaying(false));
  }
  async function toggleRecording() {
    if (recording) {
      recorder.current.stop();
      setRecording(false);
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "Ghi âm cần trình duyệt hỗ trợ và HTTPS (hoặc localhost).",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const types = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      const mime = types.find((t) => MediaRecorder.isTypeSupported(t));
      if (!mime) throw new Error("Định dạng ghi âm chưa được hỗ trợ.");
      const r = new MediaRecorder(stream.current, { mimeType: mime }),
        chunks = [];
      recorder.current = r;
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = async () => {
        clearTimeout(recordTimer.current);
        setRecording(false);
        stream.current?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: mime });
        setRecordUrl(URL.createObjectURL(blob));
        if (blob.size > 5 * 1024 * 1024) {
          notify("Bản ghi quá 5MB; hãy ghi lại ngắn hơn.");
          return;
        }
        const fr = new FileReader();
        fr.onload = async () => {
          try {
            await post("/recordings", {
              lessonId: lesson.id,
              mime,
              audio: fr.result.split(",")[1],
            });
            notify("Đã lưu bản ghi riêng tư.");
            loadRecordings();
          } catch (e) {
            notify(e.message);
          }
        };
        fr.readAsDataURL(blob);
      };
      r.start();
      setRecording(true);
      recordTimer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 180000);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      notify(e.message);
    }
  }
  const words = text.trim() ? text.trim().split(/\s+/).length : 0,
    allAnswered = lesson.questions?.every((q) => answers[q.id]);
  return (
    <div className="modal-overlay">
      <section
        ref={dialog}
        className="lesson-modal"
        role="dialog"
        aria-modal="true"
        aria-label={lesson.title}
      >
        <div className="modal-header">
          <span className={`task-icon ${skillColors[lesson.skill]}`}>
            <Icon name={lesson.skill} size={21} />
          </span>
          <div>
            <span className="eyebrow">
              {lesson.skill} · {lesson.type}
            </span>
            <h2>{lesson.title}</h2>
          </div>
          <button
            className="icon-button close"
            onClick={closeSession}
            aria-label="Đóng bài luyện"
          >
            <X />
          </button>
        </div>
        <div className="modal-content">
          {result ? (
            <Feedback result={result} lesson={lesson} close={closeSession} />
          ) : (
            <>
              <div className="session-toolbar">
                <div className="tabs">
                  <button
                    className={mode === "practice" ? "selected" : ""}
                    disabled={
                      audioPlayed ||
                      Object.keys(answers).length > 0 ||
                      Boolean(text)
                    }
                    onClick={() => setMode("practice")}
                  >
                    Luyện tập
                  </button>
                  <button
                    className={mode === "exam" ? "selected" : ""}
                    disabled={
                      audioPlayed ||
                      Object.keys(answers).length > 0 ||
                      Boolean(text)
                    }
                    onClick={() => {
                      setMode("exam");
                      setTranscript(false);
                      setPaused(false);
                    }}
                  >
                    Thi thử bài ngắn
                  </button>
                </div>
                <span className={`timer ${remaining === 0 ? "expired" : ""}`}>
                  <Clock size={16} />
                  {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                  {String(remaining % 60).padStart(2, "0")}
                  {mode === "practice" && (
                    <button
                      className="icon-button"
                      onClick={() => setPaused(!paused)}
                      aria-label={paused ? "Tiếp tục" : "Tạm dừng"}
                    >
                      {paused ? <Play size={15} /> : <Pause size={15} />}
                    </button>
                  )}
                </span>
              </div>
              {remaining === 0 && (
                <div className="note warning">
                  Đã hết thời gian gợi ý. Hãy nộp bài để lưu kết quả. Đây là bài
                  luyện ngắn, không phải kỳ thi chính thức.
                </div>
              )}
              {lesson.skill === "Listening" ? (
                <>
                  <div className="audio-box">
                    <Headphones size={32} />
                    <div>
                      <h3>{lesson.subtitle}</h3>
                      <p>
                        Giọng tổng hợp trình duyệt ·{" "}
                        {mode === "exam"
                          ? "Chỉ phát một lần"
                          : "Có thể nghe lại và xem transcript"}
                      </p>
                    </div>
                    <Button
                      className="primary"
                      onClick={play}
                      disabled={playing || (mode === "exam" && audioPlayed)}
                    >
                      <Play size={17} />
                      {playing
                        ? "Đang phát…"
                        : audioPlayed
                          ? "Nghe lại"
                          : "Phát audio"}
                    </Button>
                  </div>
                  {mode === "practice" && (
                    <button
                      className="text-link"
                      onClick={() => setTranscript(!transcript)}
                    >
                      {transcript ? "Ẩn transcript" : "Xem transcript"}
                    </button>
                  )}
                  {transcript && <div className="passage">{lesson.text}</div>}
                </>
              ) : (
                <div className="passage">{lesson.text}</div>
              )}
              {lesson.table && (
                <table className="task-table">
                  <tbody>
                    {lesson.table.map((r, i) => (
                      <tr key={i}>
                        {r.map((c, j) =>
                          i === 0 ? <th key={j}>{c}</th> : <td key={j}>{c}</td>,
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {lesson.questions ? (
                <form onSubmit={submit}>
                  <div className="questions">
                    {lesson.questions.map((q, i) => (
                      <fieldset key={q.id}>
                        <legend>
                          <span>{i + 1}</span>
                          {q.text}
                        </legend>
                        <div className="answer-options">
                          {q.options.map((o) => (
                            <label
                              key={o}
                              className={answers[q.id] === o ? "chosen" : ""}
                            >
                              <input
                                type="radio"
                                required
                                name={q.id}
                                checked={answers[q.id] === o}
                                onChange={() =>
                                  setAnswers({ ...answers, [q.id]: o })
                                }
                              />
                              {o}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                  <Button
                    className="primary"
                    disabled={
                      busy ||
                      !allAnswered ||
                      (lesson.skill === "Listening" && !audioPlayed)
                    }
                  >
                    {busy ? "Đang chấm…" : "Nộp bài & xem bằng chứng"}
                    <ArrowRight size={17} />
                  </Button>
                </form>
              ) : (
                <form onSubmit={submit}>
                  {lesson.skill === "Speaking" && (
                    <section className="record-section">
                      <div className="section-title">
                        <h3>Ghi âm câu trả lời</h3>
                        <Button
                          type="button"
                          className={recording ? "danger" : "outline"}
                          onClick={toggleRecording}
                        >
                          {recording ? <Square size={16} /> : <Mic size={16} />}{" "}
                          {recording ? "Dừng & lưu bản ghi" : "Bắt đầu ghi âm"}
                        </Button>
                      </div>
                      <p className="muted">
                        Tối đa 3 phút / 5MB. Bản ghi chỉ tài khoản của bạn truy
                        cập được. Hiện chưa có tự động chuyển giọng nói thành
                        văn bản.
                      </p>
                      {recordUrl && <audio controls src={recordUrl} />}{" "}
                      {recordings.map((r) => (
                        <div className="recording-row" key={r.id}>
                          <small>
                            {new Date(r.created).toLocaleString("vi-VN")}
                          </small>
                          <audio
                            controls
                            preload="none"
                            src={`/api/recordings/${r.id}`}
                          />
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Xóa bản ghi"
                            onClick={async () => {
                              try {
                                await api(`/recordings/${r.id}`, {
                                  method: "DELETE",
                                });
                                loadRecordings();
                              } catch (e) {
                                notify(e.message);
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </section>
                  )}
                  <label className="response-label">
                    {lesson.skill === "Speaking"
                      ? "Bản chép lời / câu trả lời của bạn"
                      : "Bài viết của bạn"}
                    <textarea
                      required
                      disabled={!loaded}
                      rows={12}
                      placeholder={
                        lesson.skill === "Speaking"
                          ? "Gõ bản chép lời để nhận phản hồi về nội dung và ngôn ngữ…"
                          : "Start writing your response here…"
                      }
                      value={text}
                      onChange={(e) => {
                        dirty.current = true;
                        setText(e.target.value);
                      }}
                      maxLength={30000}
                    />
                  </label>
                  <div className="draft-footer">
                    <span>
                      {words} từ{" "}
                      {lesson.minimumWords &&
                        `/ tối thiểu ${lesson.minimumWords}`}
                    </span>
                    <span>{saveState}</span>
                  </div>
                  {lesson.followups && mode === "practice" && (
                    <div className="followups">
                      <h4>Thử phát triển thêm ý</h4>
                      {lesson.followups.map((q) => (
                        <p key={q}>{q}</p>
                      ))}
                    </div>
                  )}
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={useAI}
                      disabled={!health.aiConfigured}
                      onChange={(e) => setUseAI(e.target.checked)}
                    />
                    <span>
                      Nhận phản hồi AI{" "}
                      {health.aiConfigured
                        ? ""
                        : "(chưa cấu hình API key; hiện dùng checklist)"}
                    </span>
                  </label>
                  <Button
                    className="primary"
                    disabled={busy || !text.trim() || recording}
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Sparkles size={17} />
                    )}{" "}
                    {busy
                      ? "Đang phân tích…"
                      : useAI
                        ? "Nhận phản hồi AI"
                        : "Lưu bài & xem checklist"}
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
function Feedback({ result, lesson, close }) {
  return (
    <div className="feedback">
      <span className="big-icon">
        <CheckCircle2 size={32} />
      </span>
      <h2>Đã lưu một bước tiến mới.</h2>
      {result.total ? (
        <div className="result-number">
          {result.correct}
          <span> / {result.total} câu đúng</span>
        </div>
      ) : result.estimated_band != null ? (
        <div className="result-number">
          {result.estimated_band.toFixed(1)}
          <span>
            {" "}
            Estimated practice band · Tin cậy{" "}
            {Math.round(result.confidence * 100)}%
          </span>
        </div>
      ) : (
        <p className="muted">
          {result.source === "checklist"
            ? "Checklist tự kiểm tra · Không gán band"
            : "Phản hồi về nội dung · Chưa đủ căn cứ để gán band tổng"}
        </p>
      )}
      <div className="note">
        <ShieldCheck size={18} />
        {result.disclaimer}
      </div>
      {result.repeated && (
        <div className="note">
          Bài này đã từng làm. Kết quả được đánh dấu “đã gặp”, không dùng làm
          điểm chẩn đoán mới.
        </div>
      )}
      {result.details?.map((q, i) => (
        <div
          className={`answer-feedback ${q.correct ? "correct" : "incorrect"}`}
          key={q.id}
        >
          <h4>
            {q.correct ? (
              <CheckCircle2 size={18} />
            ) : (
              <TriangleAlert size={18} />
            )}{" "}
            {i + 1}. {q.text}
          </h4>
          <p>
            Bạn chọn: <b>{q.response}</b> · Đáp án: <b>{q.answer}</b>
          </p>
          <blockquote>“{q.evidence}”</blockquote>
        </div>
      ))}
      {result.criteria?.map((c) => (
        <section className="criterion" key={c.name}>
          <div className="section-title">
            <h3>{c.name}</h3>
            <b>{c.score ?? "Chưa đánh giá"}</b>
          </div>
          <blockquote>{c.evidence}</blockquote>
          <p>{c.feedback}</p>
        </section>
      ))}
      {result.strengths?.length > 0 && (
        <section>
          <h3>Điểm đang làm tốt</h3>
          <ul>
            {result.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}
      {result.improvements?.length > 0 && (
        <section>
          <h3>Bước cải thiện tiếp theo</h3>
          <ul>
            {result.improvements.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}
      {result.rewrite_hint && (
        <div className="reflection">
          <PenLine size={23} />
          <p>{result.rewrite_hint}</p>
        </div>
      )}
      <Button className="primary" onClick={close}>
        Về không gian học <ArrowRight size={17} />
      </Button>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
