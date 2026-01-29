import { KabanError } from "@kaban-board/core";
import { Command } from "commander";
import { getContext } from "../lib/context.js";
import { outputError, outputSuccess } from "../lib/json-output.js";

export const getCommand = new Command("get")
  .description("View a task by ID")
  .argument("<id>", "Task ID (ULID, partial, or #number)")
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

      if (json) {
        outputSuccess(task);
        return;
      }

      console.log(`\n  [${task.id.slice(0, 8)}] ${task.title}`);
      console.log(`  Column: ${task.columnId}`);
      if (task.description) console.log(`  Description: ${task.description}`);
      if (task.assignedTo) console.log(`  Assigned: ${task.assignedTo}`);
      if (task.labels.length) console.log(`  Labels: ${task.labels.join(", ")}`);
      if (task.dueDate) console.log(`  Due: ${task.dueDate.toISOString().split("T")[0]}`);
      if (task.dependsOn.length) console.log(`  Depends on: ${task.dependsOn.length} task(s)`);
      console.log(`  Created: ${task.createdAt.toISOString()}`);
      console.log();
    } catch (error) {
      if (error instanceof KabanError) {
        if (json) outputError(error.code, error.message);
        console.error(`Error: ${error.message}`);
        process.exit(error.code);
      }
      throw error;
    }
  });
