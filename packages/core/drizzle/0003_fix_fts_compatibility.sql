-- Fix FTS5 for cross-driver compatibility (bun:sqlite + libsql)
-- Replaces external-content FTS with simple standalone FTS
-- Uses DELETE/UPDATE triggers instead of FTS5 'delete' command
DROP TABLE IF EXISTS tasks_fts;

--> statement-breakpoint
DROP TRIGGER IF EXISTS tasks_fts_insert;

--> statement-breakpoint
DROP TRIGGER IF EXISTS tasks_fts_delete;

--> statement-breakpoint
DROP TRIGGER IF EXISTS tasks_fts_update;

--> statement-breakpoint
CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
  id, title, description,
  tokenize='unicode61 remove_diacritics 2'
);

--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS tasks_fts_insert AFTER INSERT ON tasks BEGIN
  INSERT INTO tasks_fts (id, title, description)
  VALUES (NEW.id, NEW.title, COALESCE(NEW.description, ''));
END;

--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS tasks_fts_delete AFTER DELETE ON tasks BEGIN
  DELETE FROM tasks_fts WHERE id = OLD.id;
END;

--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS tasks_fts_update AFTER UPDATE ON tasks BEGIN
  UPDATE tasks_fts 
  SET title = NEW.title, description = COALESCE(NEW.description, '')
  WHERE id = OLD.id;
END;

--> statement-breakpoint
INSERT INTO tasks_fts (id, title, description)
SELECT id, title, COALESCE(description, '') FROM tasks
WHERE NOT EXISTS (SELECT 1 FROM tasks_fts LIMIT 1);
