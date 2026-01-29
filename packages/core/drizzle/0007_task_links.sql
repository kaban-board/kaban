-- Create task_links table
CREATE TABLE task_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  to_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('blocks', 'blocked_by', 'related')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(from_task_id, to_task_id, link_type)
);

--> statement-breakpoint

CREATE INDEX idx_task_links_from ON task_links(from_task_id);

--> statement-breakpoint

CREATE INDEX idx_task_links_to ON task_links(to_task_id);

--> statement-breakpoint

CREATE INDEX idx_task_links_type ON task_links(link_type);
