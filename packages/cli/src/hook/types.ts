export interface KabanTask {
  id: string;
  title: string;
  columnId: string;
  description?: string | undefined;
  labels?: string[] | undefined;
}

export interface SyncResult {
  success: boolean;
  created: number;
  moved: number;
  skipped: number;
  errors: string[];
}
