import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: boardId } = await params;

  try {
    // Connect to local Turso embedded replica
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
      syncUrl: process.env.TURSO_SYNC_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // Sync with remote before reading
    await client.sync();

    // Fetch tasks from the database
    const result = await client.execute({
      sql: `
        SELECT 
          id,
          title,
          description,
          column_id as columnId,
          priority,
          due_date as dueDate,
          created_at as createdAt
        FROM tasks 
        WHERE archived = 0
        ORDER BY position ASC, created_at DESC
      `,
      args: [],
    });

    const tasks = result.rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      description: (row.description as string) || '',
      columnId: row.columnId as string,
      priority: (row.priority as 'high' | 'medium' | 'low') || 'medium',
      dueDate: row.dueDate 
        ? new Date(row.dueDate as string).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    }));

    return NextResponse.json({ 
      boardId, 
      tasks,
      count: tasks.length 
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: String(error) },
      { status: 500 }
    );
  }
}
