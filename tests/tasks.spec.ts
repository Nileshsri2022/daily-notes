import { test, expect } from "@playwright/test";
import { extractTasks, toggleTaskInBody, countPendingTasks } from "../src/lib/tasks";

test.describe("tasks utility", () => {
  test.describe("extractTasks", () => {
    test("returns empty array for empty or whitespace string", () => {
      expect(extractTasks("")).toEqual([]);
      expect(extractTasks("   \n  \n")).toEqual([]);
    });

    test("extracts unchecked and checked markdown tasks", () => {
      const markdown = `
# Meeting Notes
- [ ] Buy groceries
- [x] Send invoice
- Regular bullet point
1. Numbered item
- [X] Uppercase checked task
`;
      const tasks = extractTasks(markdown);
      expect(tasks).toHaveLength(3);

      expect(tasks[0].text).toBe("Buy groceries");
      expect(tasks[0].completed).toBe(false);
      expect(tasks[0].lineIndex).toBe(2);

      expect(tasks[1].text).toBe("Send invoice");
      expect(tasks[1].completed).toBe(true);
      expect(tasks[1].lineIndex).toBe(3);

      expect(tasks[2].text).toBe("Uppercase checked task");
      expect(tasks[2].completed).toBe(true);
      expect(tasks[2].lineIndex).toBe(6);
    });

    test("extracts html-wrapped task paragraphs", () => {
      const htmlBody = "<p>- [ ] Complete report</p>\n<p>- [x] Review PR</p>";
      const tasks = extractTasks(htmlBody);
      expect(tasks).toHaveLength(2);
      expect(tasks[0].text).toBe("Complete report");
      expect(tasks[0].completed).toBe(false);
      expect(tasks[1].text).toBe("Review PR");
      expect(tasks[1].completed).toBe(true);
    });
  });

  test.describe("toggleTaskInBody", () => {
    test("toggles an unchecked task to checked", () => {
      const input = "Header\n- [ ] Task 1\n- [x] Task 2";
      const result = toggleTaskInBody(input, 1);
      expect(result).toBe("Header\n- [x] Task 1\n- [x] Task 2");
    });

    test("toggles a checked task to unchecked", () => {
      const input = "Header\n- [ ] Task 1\n- [x] Task 2";
      const result = toggleTaskInBody(input, 2);
      expect(result).toBe("Header\n- [ ] Task 1\n- [ ] Task 2");
    });

    test("supports explicit targetCompleted boolean", () => {
      const input = "- [ ] Task 1";
      const resultAlreadyFalse = toggleTaskInBody(input, 0, false);
      expect(resultAlreadyFalse).toBe("- [ ] Task 1");

      const resultTrue = toggleTaskInBody(input, 0, true);
      expect(resultTrue).toBe("- [x] Task 1");
    });

    test("preserves HTML closing tag when toggling", () => {
      const input = "<p>- [ ] Task with p tag</p>";
      const result = toggleTaskInBody(input, 0, true);
      expect(result).toBe("<p>- [x] Task with p tag</p>");
    });

    test("returns unchanged body when line index is invalid or line is not a task", () => {
      const input = "Not a task\n- [ ] Actual task";
      expect(toggleTaskInBody(input, -1)).toBe(input);
      expect(toggleTaskInBody(input, 99)).toBe(input);
      expect(toggleTaskInBody(input, 0)).toBe(input);
    });
  });

  test.describe("countPendingTasks", () => {
    test("returns 0 for undefined or empty notes array", () => {
      expect(countPendingTasks(undefined)).toBe(0);
      expect(countPendingTasks([])).toBe(0);
    });

    test("counts only pending tasks and excludes soft-deleted notes", () => {
      const notes = [
        {
          body: "- [ ] Task 1\n- [ ] Task 2\n- [x] Done task",
        },
        {
          body: "- [ ] Task 3\n- [x] Done task 2",
        },
        {
          body: "- [ ] Deleted note task\n- [ ] Another deleted",
          deletedAt: 1700000000,
        },
      ];

      const count = countPendingTasks(notes);
      expect(count).toBe(3); // Task 1, Task 2, Task 3 (deleted note ignored)
    });
  });
});
