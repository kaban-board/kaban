import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { BoardService } from "./board.js";
import { createDb, initializeSchema, type DB } from "../db/index.js";
import { DEFAULT_CONFIG } from "../types.js";
import { unlinkSync, existsSync, rmSync } from "node:fs";

const TEST_DIR = ".kaban-test-board";
const TEST_DB = `${TEST_DIR}/board.db`;

describe("BoardService", () => {
  let db: DB;
  let service: BoardService;

  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    db = createDb(TEST_DB);
    initializeSchema(db);
    service = new BoardService(db);
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  test("initializeBoard creates board and columns", () => {
    const board = service.initializeBoard(DEFAULT_CONFIG);

    expect(board.name).toBe("Kaban Board");
    expect(board.id).toBeDefined();

    const columns = service.getColumns();
    expect(columns).toHaveLength(5);
    expect(columns[0].id).toBe("backlog");
    expect(columns[4].isTerminal).toBe(true);
  });

  test("getBoard returns board or null", () => {
    expect(service.getBoard()).toBeNull();

    service.initializeBoard(DEFAULT_CONFIG);
    const board = service.getBoard();

    expect(board).not.toBeNull();
    expect(board?.name).toBe("Kaban Board");
  });

  test("getColumn returns column by ID", () => {
    service.initializeBoard(DEFAULT_CONFIG);

    const column = service.getColumn("in_progress");
    expect(column).not.toBeNull();
    expect(column?.wipLimit).toBe(3);

    expect(service.getColumn("nonexistent")).toBeNull();
  });

  test("getTerminalColumn returns done column", () => {
    service.initializeBoard(DEFAULT_CONFIG);

    const terminal = service.getTerminalColumn();
    expect(terminal).not.toBeNull();
    expect(terminal?.id).toBe("done");
  });
});
