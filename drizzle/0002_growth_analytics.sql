CREATE TABLE analytics_meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
INSERT INTO analytics_meta VALUES('started_at',unixepoch()*1000);
CREATE TABLE growth_sessions (id TEXT PRIMARY KEY, visitor TEXT NOT NULL, started INTEGER NOT NULL, updated INTEGER NOT NULL, source TEXT NOT NULL, medium TEXT NOT NULL, campaign TEXT NOT NULL, content TEXT NOT NULL, device TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
CREATE INDEX growth_sessions_started ON growth_sessions(started);
CREATE INDEX growth_sessions_visitor ON growth_sessions(visitor,started);
CREATE TABLE growth_events (session TEXT NOT NULL, name TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(session,name));
CREATE TABLE growth_matches (id TEXT PRIMARY KEY, room TEXT NOT NULL, started INTEGER NOT NULL, ended INTEGER, expires INTEGER NOT NULL, mode TEXT NOT NULL, humans INTEGER NOT NULL, bots INTEGER NOT NULL, rematch INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT '');
CREATE INDEX growth_matches_started ON growth_matches(started);
CREATE TABLE admin_sessions (id TEXT PRIMARY KEY, expires INTEGER NOT NULL);
