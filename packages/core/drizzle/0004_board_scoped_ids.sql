ALTER TABLE tasks ADD COLUMN board_task_id INTEGER;

--> statement-breakpoint

ALTER TABLE boards ADD COLUMN max_board_task_id INTEGER NOT NULL DEFAULT 0;

--> statement-breakpoint

WITH ranked AS (
  SELECT 
    t.id,
    ROW_NUMBER() OVER (
      PARTITION BY c.board_id 
      ORDER BY t.created_at, t.id
    ) as rn
  FROM tasks t
  JOIN columns c ON t.column_id = c.id
)
UPDATE tasks 
SET board_task_id = (SELECT rn FROM ranked WHERE ranked.id = tasks.id);

--> statement-breakpoint

UPDATE boards SET max_board_task_id = (
  SELECT COALESCE(MAX(t.board_task_id), 0)
  FROM tasks t
  JOIN columns c ON t.column_id = c.id
  WHERE c.board_id = boards.id
);
