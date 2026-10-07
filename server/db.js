import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
export function openDatabase(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
  db.exec(`
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,profile TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),lesson_id TEXT NOT NULL,skill TEXT NOT NULL,response TEXT NOT NULL,result TEXT NOT NULL,minutes INTEGER NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS drafts(user_id TEXT NOT NULL REFERENCES users(id),lesson_id TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(user_id,lesson_id));
 CREATE TABLE IF NOT EXISTS reviews(user_id TEXT NOT NULL REFERENCES users(id),word_id TEXT NOT NULL,interval INTEGER NOT NULL,due TEXT NOT NULL,PRIMARY KEY(user_id,word_id));
 CREATE TABLE IF NOT EXISTS diagnostics(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),responses TEXT NOT NULL,finished INTEGER NOT NULL DEFAULT 0,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS recordings(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),lesson_id TEXT NOT NULL,mime TEXT NOT NULL,audio BLOB NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS generated(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),skill TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL,version TEXT NOT NULL,created TEXT NOT NULL);
 `);
  return db;
}
