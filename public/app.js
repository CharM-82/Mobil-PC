const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const token = params.get("token") || localStorage.pocketToken || "dev";
localStorage.pocketToken = token;
const protocol = location.protocol === "https:" ? "wss" : "ws";
let socket;

function connect() {
  socket = new WebSocket(`${protocol}://${location.host}?role=phone&token=${encodeURIComponent(token)}`);
  socket.onopen = () => socket.send(JSON.stringify({ type: "get_projects" }));
  socket.onmessage = ({ data }) => receive(JSON.parse(data));
  socket.onclose = () => { setOnline(false); setTimeout(connect, 2000); };
}

function receive(message) {
  if (message.type === "presence") return setOnline(message.online);
  if (message.type === "projects") {
    $("#project").innerHTML = message.projects.map(({ id, name }) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`).join("") || "<option>没有项目</option>";
    return;
  }
  if (message.type === "approval") return showApproval(message);
  if (["log", "status", "file_changed", "completed", "error"].includes(message.type)) addEvent(message.message, message.type);
}

function setOnline(online) {
  $("#presence").textContent = online ? "● 电脑在线" : "● 电脑离线";
  $("#presence").className = `pill ${online ? "online" : "offline"}`;
  $("form button").disabled = !online;
}

function addEvent(text, type) {
  if (!text) return;
  $(".muted")?.remove();
  const entry = document.createElement("p");
  entry.className = "event";
  entry.textContent = text;
  const time = document.createElement("small");
  time.textContent = `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${type}`;
  entry.prepend(time);
  $("#timeline").append(entry);
  entry.scrollIntoView({ behavior: "smooth" });
}

function showApproval(message) {
  $("#approval").dataset.id = message.id;
  $("#approval-title").textContent = message.title || "Codex 请求执行操作";
  $("#approval-command").textContent = message.command || "";
  $("#approval").classList.remove("hidden");
}

function escapeHtml(value) {
  const node = document.createElement("span");
  node.textContent = value;
  return node.innerHTML;
}

$("#form").onsubmit = (event) => {
  event.preventDefault();
  const prompt = $("#prompt").value.trim();
  if (!prompt) return;
  socket.send(JSON.stringify({ type: "task", projectId: $("#project").value, prompt }));
  addEvent(`已发送：${prompt}`, "task");
  $("#prompt").value = "";
};

$("#approval").onclick = (event) => {
  const answer = event.target.dataset.answer;
  if (!answer) return;
  socket.send(JSON.stringify({ type: "approval_response", id: $("#approval").dataset.id, answer }));
  $("#approval").classList.add("hidden");
};

connect();
