import { KabanError } from "@kaban-board/core";
import { Command } from "commander";
import { getContext } from "../lib/context.js";
import { outputError, outputSuccess } from "../lib/json-output.js";

export const statsCommand = new Command("stats")
  .description("Show board and archive statistics")
  .option("-j, --json", "Output as JSON")
  .action(async (options) => {
    const json = options.json;
    try {
      const { taskService, boardService } = await getContext();

      const tasks = await taskService.listTasks();
      const columns = await boardService.getColumns();
      const terminalColumns = columns.filter((c) => c.isTerminal);
      const archivedResult = await taskService.searchArchive("", { limit: 1 });

      const completedNotArchived = tasks.filter((t) =>
        terminalColumns.some((c) => c.id === t.columnId)
      ).length;

      const blocked = tasks.filter((t) => t.blockedReason).length;
      const withDeps = tasks.filter((t) => t.dependsOn.length > 0).length;

      const stats = {
        activeTasks: tasks.length,
        archivedTasks: archivedResult.total,
        completedNotArchived,
        blockedTasks: blocked,
        tasksWithDependencies: withDeps,
        byColumn: columns.map((c) => ({
          id: c.id,
          name: c.name,
          count: tasks.filter((t) => t.columnId === c.id).length,
        })),
      };

      if (json) {
        outputSuccess(stats);
        return;
      }

      console.log("\n  Board Statistics\n");
      console.log(`  Active tasks:      ${stats.activeTasks}`);
      console.log(`  Archived tasks:    ${stats.archivedTasks}`);
      console.log(`  Completed (live):  ${stats.completedNotArchived}`);
      console.log(`  Blocked:           ${stats.blockedTasks}`);
      console.log(`  With dependencies: ${stats.tasksWithDependencies}`);
      console.log("\n  By Column:");
      for (const col of stats.byColumn) {
        console.log(`    ${col.name}: ${col.count}`);
      }
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
