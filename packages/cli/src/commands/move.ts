import { KabanError } from "@kaban-board/core";
import { Command } from "commander";
import { getAgent, getContext } from "../lib/context.js";
import { outputError, outputSuccess } from "../lib/json-output.js";

export const moveCommand = new Command("move")
  .description("Move a task to a different column")
  .argument("<id>", "Task ID (can be partial)")
  .argument("[column]", "Target column")
  .option("-n, --next", "Move to next column")
  .option("-f, --force", "Force move even if WIP limit exceeded")
  .option("-A, --assign [agent]", "Assign task to agent (defaults to current agent)")
  .option("-j, --json", "Output as JSON")
  .action(async (id, column, options) => {
    const json = options.json;
    try {
      const { taskService, boardService } = await getContext();

      const task = await taskService.resolveTask(id);

      if (!task) {
        if (json) outputError(2, `Task '${id}' not found`);
        console.error(`Error: Task '${id}' not found`);
        process.exit(2);
      }

      let targetColumn = column;

      if (options.next) {
        const columns = await boardService.getColumns();
        const currentIdx = columns.findIndex((c) => c.id === task.columnId);
        if (currentIdx < columns.length - 1) {
          targetColumn = columns[currentIdx + 1].id;
        } else {
          if (json) outputError(4, "Task is already in the last column");
          console.error("Error: Task is already in the last column");
          process.exit(4);
        }
      }

      if (!targetColumn) {
        if (json) outputError(4, "Specify a column or use --next");
        console.error("Error: Specify a column or use --next");
        process.exit(4);
      }

      // Move first, then assign (atomic: if move fails, no side effects)
      const moved = await taskService.moveTask(task.id, targetColumn, {
        force: options.force,
      });

      // Assign after successful move
      let assignAgent: string | null = null;
      if (options.assign !== undefined) {
        assignAgent = options.assign === true ? getAgent() : options.assign;
        await taskService.updateTask(moved.id, { assignedTo: assignAgent });
      }

      const finalTask = assignAgent ? await taskService.getTask(moved.id) : moved;

      if (json) {
        outputSuccess(finalTask);
        return;
      }

      const col = await boardService.getColumn(moved.columnId);
      let msg = `Moved [${moved.id.slice(0, 8)}] to ${col?.name}`;
      if (assignAgent) {
        msg += ` (assigned to ${assignAgent})`;
      }
      console.log(msg);
    } catch (error) {
      if (error instanceof KabanError) {
        if (json) outputError(error.code, error.message);
        console.error(`Error: ${error.message}`);
        process.exit(error.code);
      }
      throw error;
    }
  });
