import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { WebSocket } from "ws";
import { decode, encode, publicProject } from "./protocol.js";

const server = process.env.POCKET_SERVER || "ws://localhost:3000";
const token = process.env.POCKET_TOKEN || "dev";
const projectsFile = process.env.POCKET_PROJECTS || new URL("./projects.json", import.meta.url);
const projects = JSON.parse(await readFile(projectsFile, "utf8"));
let socket;
let current = null;

function connect() {
  socket = new WebSocket(`${server.replace(/^http/, "ws")}?role=agent&token=${encodeURIComponent(token)}`);
  socket.on("open", () => socket.send(encode("projects", { projects: projects.map(publicProject) })));
  socket.on("message", (raw) => handle(decode(raw)));
  socket.on("close", () => setTimeout(connect, 2000));
  socket.on("error", () => {});
}

function send(type, payload = {}) {
  socket?.readyState === WebSocket.OPEN && socket.send(encode(type, payload));
}

function handle(message) {
  if (!message) return;
  if (message.type === "get_projects") return send("projects", { projects: projects.map(publicProject) });
  if (message.type === "task") runTask(message);
}

function runTask({ projectId, prompt }) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return send("error", { message: "项目不存在" });
  if (current) return send("error", { message: "Codex 正在执行另一个任务" });

  send("status", { state: "working", message: "Codex 已开始工作" });
  current = spawn("codex", ["exec", "--json", "--color", "never", "--ask-for-approval", "never", "--sandbox", "workspace-write", "-C", project.path, prompt], {
    env: process.env
  });

  let pending = "";
  current.stdout.on("data", (chunk) => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop();
    lines.forEach(forwardEvent);
  });
  current.stderr.on("data", (chunk) => send("log", { message: String(chunk).trim() }));
  current.on("close", (code) => {
    if (pending) forwardEvent(pending);
    send(code === 0 ? "completed" : "error", code === 0 ? { message: "任务完成" } : { message: `Codex 退出，代码 ${code}` });
    send("status", { state: code === 0 ? "idle" : "error", message: code === 0 ? "空闲" : "执行出错" });
    current = null;
  });
}

function forwardEvent(line) {
  try {
    const event = JSON.parse(line);
    if (event.type === "item.completed") {
      const item = event.item || {};
      if (item.type === "agent_message") send("log", { message: item.text });
      else if (item.type === "command_execution") send("log", { message: `$ ${item.command}\n${item.aggregated_output || ""}`.trim() });
      else if (item.type === "file_change") send("file_changed", { message: item.path || "文件已修改" });
    } else if (event.type === "turn.started") send("log", { message: "正在分析任务…" });
  } catch {
    if (line.trim()) send("log", { message: line.trim() });
  }
}

connect();
