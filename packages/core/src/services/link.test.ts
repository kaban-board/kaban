import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { createDb, type DB, initializeSchema } from "../db/index.js";
import { DEFAULT_CONFIG } from "../types.js";
import { BoardService } from "./board.js";
import { LinkService } from "./link.js";
import { TaskService } from "./task.js";

const TEST_DIR = ".kaban-test-link";
const TEST_DB = `${TEST_DIR}/board.db`;

describe("LinkService", () => {
  let db: DB;
  let boardService: BoardService;
  let taskService: TaskService;
  let linkService: LinkService;

  beforeEach(async () => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    db = await createDb(TEST_DB);
    await initializeSchema(db);
    boardService = new BoardService(db);
    taskService = new TaskService(db, boardService);
    linkService = new LinkService(db);
    await boardService.initializeBoard(DEFAULT_CONFIG);
  });

  afterEach(async () => {
    await db.$close();
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  describe("addLink", () => {
    test("creates blocks link", async () => {
      const a = await taskService.addTask({ title: "A" });
      const b = await taskService.addTask({ title: "B" });

      const link = await linkService.addLink(a.id, b.id, "blocks");

      expect(link.fromTaskId).toBe(a.id);
      expect(link.toTaskId).toBe(b.id);
      expect(link.linkType).toBe("blocks");
    });

    test("auto-creates inverse blocked_by for blocks", async () => {
      const a = await taskService.addTask({ title: "A" });
      const b = await taskService.addTask({ title: "B" });

      await linkService.addLink(a.id, b.id, "blocks");

      const inverseLinks = await linkService.getLinksFrom(b.id, "blocked_by");
      expect(inverseLinks).toHaveLength(1);
      expect(inverseLinks[0].toTaskId).toBe(a.id);
    });

    test("auto-creates inverse blocks for blocked_by", async () => {
      const a = await taskService.addTask({ title: "A" });
      const b = await taskService.addTask({ title: "B" });

      await linkService.addLink(a.id, b.id, "blocked_by");

      const inverseLinks = await linkService.getLinksFrom(b.id, "blocks");
      expect(inverseLinks).toHaveLength(1);
      expect(inverseLinks[0].toTaskId).toBe(a.id);
    });

    test("related link does not auto-create inverse", async () => {
      const a = await taskService.addTask({ title: "A" });
      const b = await taskService.addTask({ title: "B" });

      await linkService.addLink(a.id, b.id, "related");

      const inverseLinks = await linkService.getLinksFrom(b.id);
      expect(inverseLinks).toHaveLength(0);
    });

    test("throws on self-link", async () => {
      const a = await taskService.addTask({ title: "A" });

      await expect(linkService.addLink(a.id, a.id, "blocks")).rejects.toThrow(/itself/i);
    });

    test("idempotent - duplicate link is ignored", async () => {
      const a = await taskService.addTask({ title: "A" });
      const b = await taskService.addTask({ title: "B" });

      await linkService.addLink(a.id, b.id, "blocks");
      await linkService.addLink(a.id, b.id, "blocks");

      const links = await linkService.getLinksFrom(a.id, "blocks");
      expect(links).toHaveLength(1);
    });
  });

  describe("removeLink", () => {
    test("removes link", async () => {
      const a = await taskService.addTask({ title: "A" });
      const b = await taskService.addTask({ title: "B" });

      await linkService.addLink(a.id, b.id, "blocks");
      await linkService.removeLink(a.id, b.id, "blocks");

      const links = await linkService.getLinksFrom(a.id, "blocks");
      expect(links).toHaveLength(0);
    });

    test("removes inverse link for blocks", async () => {
      const a = await taskService.addTask({ title: "A" });
      const b = await taskService.addTask({ title: "B" });

      await linkService.addLink(a.id, b.id, "blocks");
      await linkService.removeLink(a.id, b.id, "blocks");

      const inverseLinks = await linkService.getLinksFrom(b.id, "blocked_by");
      expect(inverseLinks).toHaveLength(0);
    });
  });

  describe("getBlockers / getBlocking", () => {
    test("getBlockers returns blocking task IDs", async () => {
      const a = await taskService.addTask({ title: "A" });
      const b = await taskService.addTask({ title: "B" });
      const c = await taskService.addTask({ title: "C" });

      await linkService.addLink(a.id, b.id, "blocked_by");
      await linkService.addLink(a.id, c.id, "blocked_by");

      const blockers = await linkService.getBlockers(a.id);
      expect(blockers).toContain(b.id);
      expect(blockers).toContain(c.id);
      expect(blockers).toHaveLength(2);
    });

    test("getBlocking returns tasks being blocked", async () => {
      const a = await taskService.addTask({ title: "A" });
      const b = await taskService.addTask({ title: "B" });

      await linkService.addLink(a.id, b.id, "blocks");

      const blocking = await linkService.getBlocking(a.id);
      expect(blocking).toContain(b.id);
    });
  });

  describe("cascade delete", () => {
    test.skip("links are deleted when task is deleted (requires PRAGMA foreign_keys = ON)", async () => {
      const a = await taskService.addTask({ title: "A" });
      const b = await taskService.addTask({ title: "B" });

      await linkService.addLink(a.id, b.id, "blocks");
      await taskService.deleteTask(a.id);

      const allLinks = await linkService.getAllLinks(b.id);
      expect(allLinks).toHaveLength(0);
    });
  });
});
