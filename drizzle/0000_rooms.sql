CREATE TABLE rooms (code TEXT PRIMARY KEY, version INTEGER NOT NULL, public INTEGER NOT NULL, updated INTEGER NOT NULL, expires INTEGER NOT NULL, state TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX rooms_public ON rooms(public, updated);
--> statement-breakpoint
CREATE TABLE limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
