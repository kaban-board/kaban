"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, MoreHorizontal, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface Task {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
  columnId: string;
}

interface Column {
  id: string;
  title: string;
  color: string;
}

const COLUMNS: Column[] = [
  { id: "backlog", title: "Backlog", color: "bg-slate-500" },
  { id: "todo", title: "To Do", color: "bg-slate-500" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-500" },
  { id: "review", title: "Review", color: "bg-amber-500" },
  { id: "done", title: "Done", color: "bg-emerald-500" },
];

const PRIORITY_COLORS = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export default function KanbanBoard() {
  const params = useParams();
  const boardId = params.id as string;
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [activeColumn, setActiveColumn] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        const response = await fetch(`/api/boards/${boardId}/tasks`);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const data = await response.json();
        setTasks(data.tasks || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("Error fetching tasks:", err);
      } finally {
        setLoading(false);
      }
    }

    if (boardId) {
      fetchTasks();
    }
  }, [boardId]);

  const addTask = (columnId: string) => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      description: newTaskDescription,
      priority: newTaskPriority,
      dueDate: new Date().toISOString().split("T")[0],
      columnId,
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskPriority("medium");
    setIsDialogOpen(false);
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newColumnId = destination.droppableId;

    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === draggableId ? { ...t, columnId: newColumnId } : t
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">Error loading board</p>
          <p className="text-slate-400 text-sm">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
                Kaban Board
              </h1>
              <p className="text-slate-400 font-mono text-sm">
                ID: {boardId}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {tasks.length} tasks loaded
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </div>
              <Button variant="outline" size="sm">
                Share Board
              </Button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-5 gap-6">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter((t) => t.columnId === column.id);

            return (
              <div key={column.id} className="flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", column.color)} />
                    <h2 className="font-semibold text-slate-200 uppercase tracking-wider text-sm">
                      {column.title}
                    </h2>
                    <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 min-h-[200px]"
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                              }}
                            >
                              <Card
                                className={cn(
                                  "bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all group cursor-pointer",
                                  snapshot.isDragging && "shadow-lg border-indigo-500/50 rotate-2"
                                )}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <span
                                      className={cn(
                                        "text-xs px-2 py-0.5 rounded border",
                                        PRIORITY_COLORS[task.priority]
                                      )}
                                    >
                                      {task.priority}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => deleteTask(task.id)}
                                    >
                                      <Trash2 className="h-3 w-3 text-slate-500 hover:text-red-400" />
                                    </Button>
                                  </div>

                                  <h3 className="font-medium text-slate-200 mb-1">{task.title}</h3>
                                  <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                                    {task.description}
                                  </p>

                                  <div className="flex items-center justify-between text-xs text-slate-500">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {task.dueDate}
                                    </div>
                                    <div className="flex -space-x-2">
                                      <div className="w-6 h-6 rounded-full bg-indigo-500/30 border border-slate-800 flex items-center justify-center text-[10px]">
                                        JD
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                <Dialog open={isDialogOpen && activeColumn === column.id} onOpenChange={(open: boolean) => {
                  setIsDialogOpen(open);
                  if (open) setActiveColumn(column.id);
                }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="mt-4 w-full border-2 border-dashed border-slate-800 hover:border-slate-600 hover:bg-slate-900/50 h-12"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <DialogHeader>
                      <DialogTitle className="text-white">Add New Task</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Create a new task in {column.title}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Title</label>
                        <Input
                          placeholder="Task title..."
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Description</label>
                        <Input
                          placeholder="Task description..."
                          value={newTaskDescription}
                          onChange={(e) => setNewTaskDescription(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Priority</label>
                        <div className="flex gap-2">
                          {(["low", "medium", "high"] as const).map((p) => (
                            <Button
                              key={p}
                              type="button"
                              variant={newTaskPriority === p ? "default" : "outline"}
                              size="sm"
                              onClick={() => setNewTaskPriority(p)}
                              className={cn(
                                "capitalize",
                                newTaskPriority === p && PRIORITY_COLORS[p]
                              )}
                            >
                              {p}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        className="border-slate-700"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => addTask(column.id)}
                        disabled={!newTaskTitle.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        Add Task
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </DragDropContext>
  );
}
