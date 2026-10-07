import { existsSync } from "node:fs";
if (existsSync(".env")) process.loadEnvFile(".env");
const { openDatabase } = await import("./db.js");
const { createApp } = await import("./app.js");
const db = openDatabase(process.env.DATABASE_PATH || "./data/ielts.sqlite");
const port = Number(process.env.PORT || 3001);
const server = createApp(db).listen(port, "0.0.0.0", () =>
  console.log(`IELTS Duo server listening on port ${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
