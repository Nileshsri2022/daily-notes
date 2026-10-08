export interface TaskItem {
  id: string;
  lineIndex: number;
  text: string;
  completed: boolean;
}

const TASK_REGEX = /^(\s*(?:<p>)?\s*)-\s*\[([ xX])\]\s*(.*?)(?:<\/p>)?$/;

/**
 * Extracts all markdown checklist tasks from note body text (supports both markdown and html-wrapped lines).
 */
export function extractTasks(body: string): TaskItem[] {
  if (!body) return [];

  const lines = body.split("\n");
  const tasks: TaskItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(TASK_REGEX);
    if (match) {
      const isCompleted = match[2].toLowerCase() === "x";
      const text = match[3].trim();
      tasks.push({
        id: `task-${i}`,
        lineIndex: i,
        text,
        completed: isCompleted,
      });
    }
  }

  return tasks;
}

/**
 * Toggles a task checkbox in note body at a specific line index.
 */
export function toggleTaskInBody(
  body: string,
  lineIndex: number,
  targetCompleted?: boolean
): string {
  if (!body) return body;

  const lines = body.split("\n");
  if (lineIndex < 0 || lineIndex >= lines.length) return body;

  const targetLine = lines[lineIndex];
  const match = targetLine.match(TASK_REGEX);
  if (!match) return body;

  const prefix = match[1];
  const currentlyCompleted = match[2].toLowerCase() === "x";
  const newCompleted =
    targetCompleted !== undefined ? targetCompleted : !currentlyCompleted;
  const taskText = match[3];
  const hasClosingP = targetLine.endsWith("</p>");

  lines[lineIndex] = `${prefix}- [${newCompleted ? "x" : " "}] ${taskText}${
    hasClosingP ? "</p>" : ""
  }`;
  return lines.join("\n");
}
