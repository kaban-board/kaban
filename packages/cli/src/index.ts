#!/usr/bin/env bun
import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { doneCommand } from "./commands/done.js";
import { initCommand } from "./commands/init.js";
import { listCommand } from "./commands/list.js";
import { mcpCommand } from "./commands/mcp.js";
import { moveCommand } from "./commands/move.js";
import { schemaCommand } from "./commands/schema.js";
import { statusCommand } from "./commands/status.js";
import { tuiCommand } from "./commands/tui.js";

const program = new Command();

program.name("kaban").description("Terminal Kanban for AI Code Agents").version("0.1.0");

program.addCommand(initCommand);
program.addCommand(addCommand);
program.addCommand(listCommand);
program.addCommand(moveCommand);
program.addCommand(doneCommand);
program.addCommand(statusCommand);
program.addCommand(schemaCommand);
program.addCommand(mcpCommand);
program.addCommand(tuiCommand);

program.parse();
