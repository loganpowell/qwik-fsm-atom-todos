import type { RequestHandler } from "@builder.io/qwik-city";
import { readFileSync } from "fs";
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

const readData = (): TodoData => {
  const dataPath = getDataPath();
  return JSON.parse(readFileSync(dataPath, "utf-8"));
};

export const onGet: RequestHandler = async ({ json }) => {
  console.log("\n=== Load Todos API Request ===");
  console.log("Time:", new Date().toISOString());

  try {
    const data = readData();
    console.log(`✅ Successfully loaded ${data.todos.length} todos from file`);

    json(200, {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error loading todos:", error);
    json(500, {
      error: "Failed to load todos",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
