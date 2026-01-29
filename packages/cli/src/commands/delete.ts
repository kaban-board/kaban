import { KabanError } from "@kaban-board/core";
import { Command } from "commander";
import { createInterface } from "readline";
import { getContext } from "../lib/context.js";
import { outputError, outputSuccess } from "../lib/json-output.js";

export const deleteCommand = new Command("delete")
  .description("Delete a task")
  .argument("<id>", "Task ID")
  .option("-f, --force", "Skip confirmation")
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

      if (!options.force && !json) {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise<string>((resolve) => {
          rl.question(`Delete "${task.title}"? [y/N] `, resolve);
        });
        rl.close();
        if (answer.toLowerCase() !== "y") {
          console.log("Cancelled");
          return;
        }
      }

      await taskService.deleteTask(task.id);

      if (json) {
        outputSuccess({ deleted: true, id: task.id });
        return;
      }

      console.log(`Deleted [${task.id.slice(0, 8)}] "${task.title}"`);
    } catch (error) {
      if (error instanceof KabanError) {
        if (json) outputError(error.code, error.message);
        console.error(`Error: ${error.message}`);
        process.exit(error.code);
      }
      throw error;
    }
  });
