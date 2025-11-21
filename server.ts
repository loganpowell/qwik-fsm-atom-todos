import express from "express";
import cors from "cors";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const getDataPath = () => join(process.cwd(), "data", "todos.json");

// Load todos
app.get("/api/load-todos", (req, res) => {
  try {
    const data = JSON.parse(readFileSync(getDataPath(), "utf-8"));
    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: "Failed to load todos" });
  }
});

// Save todos
app.post("/api/save-todos", (req, res) => {
  try {
    writeFileSync(getDataPath(), JSON.stringify(req.body, null, 2), "utf-8");
    res.json({
      success: true,
      message: `Saved ${req.body.todos.length} todos`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to save todos" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});
