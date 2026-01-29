import { and, eq, or } from "drizzle-orm";
import { taskLinks, type LinkType } from "../db/schema.js";
import type { DB } from "../db/types.js";
import { ExitCode, KabanError } from "../types.js";

export interface TaskLink {
  id: number;
  fromTaskId: string;
  toTaskId: string;
  linkType: LinkType;
  createdAt: Date;
}

export class LinkService {
  constructor(private db: DB) {}

  async addLink(fromTaskId: string, toTaskId: string, type: LinkType): Promise<TaskLink> {
    if (fromTaskId === toTaskId) {
      throw new KabanError("Task cannot link to itself", ExitCode.VALIDATION);
    }

    const now = new Date();

    await this.db.insert(taskLinks).values({
      fromTaskId,
      toTaskId,
      linkType: type,
      createdAt: now,
    }).onConflictDoNothing();

    if (type === "blocks") {
      await this.db.insert(taskLinks).values({
        fromTaskId: toTaskId,
        toTaskId: fromTaskId,
        linkType: "blocked_by",
        createdAt: now,
      }).onConflictDoNothing();
    } else if (type === "blocked_by") {
      await this.db.insert(taskLinks).values({
        fromTaskId: toTaskId,
        toTaskId: fromTaskId,
        linkType: "blocks",
        createdAt: now,
      }).onConflictDoNothing();
    }

    const result = await this.db
      .select()
      .from(taskLinks)
      .where(
        and(
          eq(taskLinks.fromTaskId, fromTaskId),
          eq(taskLinks.toTaskId, toTaskId),
          eq(taskLinks.linkType, type)
        )
      )
      .limit(1);

    return result[0];
  }

  async removeLink(fromTaskId: string, toTaskId: string, type: LinkType): Promise<void> {
    await this.db.delete(taskLinks).where(
      and(
        eq(taskLinks.fromTaskId, fromTaskId),
        eq(taskLinks.toTaskId, toTaskId),
        eq(taskLinks.linkType, type)
      )
    );

    if (type === "blocks") {
      await this.db.delete(taskLinks).where(
        and(
          eq(taskLinks.fromTaskId, toTaskId),
          eq(taskLinks.toTaskId, fromTaskId),
          eq(taskLinks.linkType, "blocked_by")
        )
      );
    } else if (type === "blocked_by") {
      await this.db.delete(taskLinks).where(
        and(
          eq(taskLinks.fromTaskId, toTaskId),
          eq(taskLinks.toTaskId, fromTaskId),
          eq(taskLinks.linkType, "blocks")
        )
      );
    }
  }

  async getLinksFrom(taskId: string, type?: LinkType): Promise<TaskLink[]> {
    if (type) {
      return this.db
        .select()
        .from(taskLinks)
        .where(and(eq(taskLinks.fromTaskId, taskId), eq(taskLinks.linkType, type)));
    }
    return this.db.select().from(taskLinks).where(eq(taskLinks.fromTaskId, taskId));
  }

  async getLinksTo(taskId: string, type?: LinkType): Promise<TaskLink[]> {
    if (type) {
      return this.db
        .select()
        .from(taskLinks)
        .where(and(eq(taskLinks.toTaskId, taskId), eq(taskLinks.linkType, type)));
    }
    return this.db.select().from(taskLinks).where(eq(taskLinks.toTaskId, taskId));
  }

  async getAllLinks(taskId: string): Promise<TaskLink[]> {
    return this.db
      .select()
      .from(taskLinks)
      .where(or(eq(taskLinks.fromTaskId, taskId), eq(taskLinks.toTaskId, taskId)));
  }

  async getBlockers(taskId: string): Promise<string[]> {
    const links = await this.getLinksFrom(taskId, "blocked_by");
    return links.map((l) => l.toTaskId);
  }

  async getBlocking(taskId: string): Promise<string[]> {
    const links = await this.getLinksFrom(taskId, "blocks");
    return links.map((l) => l.toTaskId);
  }
}
