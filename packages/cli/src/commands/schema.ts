import { jsonSchemas } from "@kaban-board/core";
import { Command } from "commander";

const availableSchemas = Object.keys(jsonSchemas);

export const schemaCommand = new Command("schema")
  .description("Output JSON schemas for AI agents")
  .argument("[name]", "Schema name (omit to list available)")
  .action((name) => {
    if (!name) {
      console.log("Available schemas:");
      for (const schemaName of availableSchemas) {
        console.log(`  - ${schemaName}`);
      }
      console.log("\nUsage: kaban schema <name>");
      return;
    }

    const schema = jsonSchemas[name as keyof typeof jsonSchemas];
    if (!schema) {
      console.error(`Error: Unknown schema '${name}'`);
      console.error(`Available: ${availableSchemas.join(", ")}`);
      process.exit(1);
    }

    console.log(JSON.stringify(schema, null, 2));
  });
