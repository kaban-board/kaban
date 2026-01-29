import { KabanError } from "@kaban-board/core";
import { Command } from "commander";
import { getContext } from "../lib/context.js";
import { outputError, outputSuccess } from "../lib/json-output.js";

export const editCommand = new Command("edit")
  .description("Edit a task")
  .argument("<id>", "Task ID")
  .option("-t, --title <title>", "New title")
  .option("-d, --description <desc>", "New description")
  .option("--clear-description", "Clear description")
  .option("-l, --labels <labels>", "Labels (comma-separated)")
  .option("--due <date>", "Due date (natural language)")
  .option("--clear-due", "Clear due date")
  .option("-j, --json", "Output as JSON")
  .action(async (id, options) => {
    const json = options.json;
    try {
      const { taskService } = await getContext();
      const task = await taskService.resolveTask(id);

      if (!task) {
        if (json) outputError(2, `Task '${id}' not found`);
        console.error(`Error: Task '${id}' not found`);
        process.exit(2);
      }

      const updates: Record<string, unknown> = {};
      if (options.title) updates.title = options.title;
      if (options.description) updates.description = options.description;
      if (options.clearDescription) updates.description = null;
      if (options.labels) updates.labels = options.labels.split(",").map((l: string) => l.trim());
      if (options.due) updates.dueDate = options.due;
      if (options.clearDue) updates.dueDate = null;

      if (Object.keys(updates).length === 0) {
        if (json) outputError(4, "No updates specified");
        console.error("Error: No updates specified. Use --title, --description, etc.");
        process.exit(4);
      }

      const updated = await taskService.updateTask(task.id, updates);

      if (json) {
        outputSuccess(updated);
        return;
      }

      console.log(`Updated [${updated.id.slice(0, 8)}] "${updated.title}"`);
    } catch (error) {
      if (error instanceof KabanError) {
        if (json) outputError(error.code, error.message);
        console.error(`Error: ${error.message}`);
        process.exit(error.code);
      }
      throw error;
    }
  });
