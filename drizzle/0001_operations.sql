CREATE TABLE buckets (key TEXT PRIMARY KEY, tokens REAL NOT NULL, updated INTEGER NOT NULL, expires INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE security_bans (key TEXT PRIMARY KEY, strikes INTEGER NOT NULL DEFAULT 0, until_at INTEGER NOT NULL DEFAULT 0, expires INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE reports (id TEXT PRIMARY KEY, room TEXT NOT NULL, reporter TEXT NOT NULL, target TEXT NOT NULL, nickname TEXT NOT NULL, clue TEXT, reason TEXT NOT NULL, created INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open', note TEXT NOT NULL DEFAULT '');
--> statement-breakpoint
CREATE INDEX reports_created ON reports(created);
--> statement-breakpoint
CREATE TABLE metrics (day TEXT NOT NULL, name TEXT NOT NULL, value REAL NOT NULL DEFAULT 0, samples INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day,name));
--> statement-breakpoint
CREATE TABLE analytics_visits (visitor TEXT NOT NULL, week INTEGER NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(visitor,week));
--> statement-breakpoint
CREATE TABLE operations_audit (id TEXT PRIMARY KEY, action TEXT NOT NULL, target TEXT NOT NULL, created INTEGER NOT NULL);
