import type { RequestHandler } from "@builder.io/qwik-city";
import { writeFileSync } from "fs";
import { join } from "path";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoData {
  todos: Todo[];
}

const getDataPath = () => join(process.cwd(), "public", "todos.json");

const writeData = (data: TodoData) => {
  const dataPath = getDataPath();
  writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf-8");
};

export const onPost: RequestHandler = async ({ request, json }) => {
  console.log("\n=== Save Todos API Request ===");
  console.log("Time:", new Date().toISOString());

  try {
    const body = (await request.json()) as TodoData;
    console.log("Saving todos:", JSON.stringify(body, null, 2));

    // Validate the data structure
    if (!body || !Array.isArray(body.todos)) {
      json(400, { error: "Invalid data format. Expected { todos: Todo[] }" });
      return;
    }

    // Validate each todo
    for (const todo of body.todos) {
      if (
        !todo.id ||
        typeof todo.text !== "string" ||
        typeof todo.completed !== "boolean"
      ) {
        json(400, {
          error: "Invalid todo format. Expected { id, text, completed }",
        });
        return;
      }
    }

    // Write to file
    writeData(body);

    console.log("✅ Successfully saved todos to file");
    json(200, {
      success: true,
      message: `Saved ${body.todos.length} todos`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error saving todos:", error);
    json(500, {
      error: "Failed to save todos",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
