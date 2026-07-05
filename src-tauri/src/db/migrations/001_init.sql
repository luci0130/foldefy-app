CREATE TABLE files (
    id INTEGER PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES files(id),
    name TEXT NOT NULL,
    ext TEXT,
    size INTEGER,
    mtime INTEGER,
    kind TEXT,
    drive TEXT,
    is_dir INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_files_parent ON files(parent_id);
CREATE INDEX idx_files_ext ON files(ext);

CREATE TABLE scan_runs (
    id INTEGER PRIMARY KEY,
    root TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    stats_json TEXT
);

CREATE TABLE sort_batches (
    id INTEGER PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    mode TEXT NOT NULL DEFAULT 'auto',
    scope_json TEXT,
    status TEXT NOT NULL DEFAULT 'planned'
);

CREATE TABLE move_journal (
    id INTEGER PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES sort_batches(id),
    kind TEXT NOT NULL DEFAULT 'move',
    src TEXT NOT NULL,
    dst TEXT NOT NULL,
    size INTEGER,
    mtime INTEGER,
    status TEXT NOT NULL DEFAULT 'planned',
    error TEXT,
    executed_at TEXT
);
CREATE INDEX idx_journal_batch ON move_journal(batch_id);
CREATE INDEX idx_journal_status ON move_journal(status);

CREATE TABLE recommendations (
    id INTEGER PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    provider TEXT NOT NULL,
    root TEXT,
    json TEXT NOT NULL
);
