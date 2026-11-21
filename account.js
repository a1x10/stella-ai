const CLOUD_API = "https://stella-openrouter-proxy.stella-ai-a1x10.workers.dev";

const authView = document.getElementById("authView");
const dashView = document.getElementById("dashView");
const headerUserChip = document.getElementById("headerUserChip");

const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const siteName = document.getElementById("siteName");
const siteEmail = document.getElementById("siteEmail");
const sitePass = document.getElementById("sitePass");
const siteCountry = document.getElementById("siteCountry");
const siteConsent = document.getElementById("siteConsent");
const siteAuthStatus = document.getElementById("siteAuthStatus");

const dashUserTitle = document.getElementById("dashUserTitle");
const dashUserMeta = document.getElementById("dashUserMeta");
const dashPresets = document.getElementById("dashPresets");
const siteLogoutBtn = document.getElementById("siteLogoutBtn");
const cloudAgentRole = document.getElementById("cloudAgentRole");
const cloudPrompt = document.getElementById("cloudPrompt");
const runCloudTaskBtn = document.getElementById("runCloudTaskBtn");
const cloudTasksList = document.getElementById("cloudTasksList");
const connsList = document.getElementById("connsList");
const mcpCatalogGrid = document.getElementById("mcpCatalogGrid");
const mcpFilterTabs = document.querySelectorAll("#mcpFilterTabs .b-tab");

let authMode = "login";
let session = null;
let mcpCatalog = [];
let activeCat = "all";
let activeProviders = {};

try {
  session = JSON.parse(localStorage.getItem("stella_cloud_session") || "null");
} catch (_) {}

function escapeHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function saveSession(s) {
  session = s;
  if (s) localStorage.setItem("stella_cloud_session", JSON.stringify(s));
  else localStorage.removeItem("stella_cloud_session");
  renderUI();
}

// Switch Login / Register tabs
function setAuthMode(mode) {
  authMode = mode;
  tabLogin.classList.toggle("active", mode === "login");
  tabRegister.classList.toggle("active", mode === "register");
  document.querySelectorAll(".reg-only").forEach((el) => {
    el.classList.toggle("hidden", mode !== "register");
  });
  authSubmitBtn.textContent = mode === "register" ? "Создать аккаунт" : "Войти";
}

tabLogin.addEventListener("click", () => setAuthMode("login"));
tabRegister.addEventListener("click", () => setAuthMode("register"));

// Workspace tabs (Cloud Agents / Factory MCPs / Profile)
document.querySelectorAll("#wsTabs .ws-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#wsTabs .ws-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.getAttribute("data-ws");
    ["agents", "mcps", "profile"].forEach((id) => {
      document.getElementById(`ws-${id}`)?.classList.toggle("hidden", id !== target);
    });
  });
});

// Handle OAuth callback redirect (#stella_token=...)
(async function handleOAuthRedirect() {
  const hash = location.hash || "";
  const m = hash.match(/stella_token=(stl_[a-zA-Z0-9]+)/);
  if (!m) return;
  const token = m[1];
  history.replaceState(null, "", location.pathname);
  try {
    const res = await fetch(`${CLOUD_API}/api/profile`, { headers: { "X-Stella-Token": token } });
    const data = await res.json();
    if (data.ok && data.user) saveSession({ token, user: data.user });
  } catch (_) {}
})();

// Load active OAuth providers
fetch(`${CLOUD_API}/api/auth/providers`)
  .then((r) => r.json())
  .then((d) => { if (d?.providers) activeProviders = d.providers; })
  .catch(() => {});

// OAuth buttons
document.querySelectorAll("[data-oauth]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const prov = btn.getAttribute("data-oauth");
    if (activeProviders[prov]) {
      location.href = `${CLOUD_API}/api/auth/oauth/${prov}?country=${encodeURIComponent(siteCountry.value)}`;
      return;
    }
    const hints = {
      google: "Подключаю Google OAuth...",
      github: "Для GitHub нужно добавить GITHUB_CLIENT_ID и SECRET (Google и вход в 1 клик уже работают!).",
      microsoft: "Для Microsoft нужно добавить MICROSOFT_CLIENT_ID и SECRET (Google и вход в 1 клик уже работают!).",
      telegram: "Для Telegram нужен TELEGRAM_BOT_TOKEN от @BotFather.",
      discord: "Для Discord нужен DISCORD_CLIENT_ID и SECRET.",
    };
    siteAuthStatus.textContent = hints[prov] || "Выберите другой способ входа.";
  });
});

// 1-Click Login
document.getElementById("quickOneClickBtn")?.addEventListener("click", async () => {
  siteAuthStatus.textContent = "Создаю профиль в 1 клик...";
  let devId = localStorage.getItem("stella_device_id");
  if (!devId) {
    devId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("stella_device_id", devId);
  }
  try {
    const res = await fetch(`${CLOUD_API}/api/auth/quick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "quick",
        deviceId: devId,
        name: siteName.value.trim() || "Пользователь Стеллы",
        country: siteCountry.value,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      siteAuthStatus.textContent = "";
      saveSession({ token: data.token, user: data.user });
    } else {
      siteAuthStatus.textContent = data.error || "Ошибка входа";
    }
  } catch (e) {
    siteAuthStatus.textContent = "Ошибка сети: " + String(e.message || e);
  }
});

// Passkey / Biometrics
document.getElementById("passkeyBtn")?.addEventListener("click", async () => {
  if (!window.PublicKeyCredential) {
    siteAuthStatus.textContent = "Браузер не поддерживает Passkey — войдите через Google или в 1 клик.";
    return;
  }
  siteAuthStatus.textContent = "Подтвердите Touch ID / Face ID / Windows Hello...";
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: "Stella AI Cloud" },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: siteEmail.value.trim() || "stella-user",
          displayName: siteName.value.trim() || "Stella User",
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { userVerification: "preferred" },
        timeout: 60000,
      },
    });
    const credId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId))).replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
    const res = await fetch(`${CLOUD_API}/api/auth/quick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "passkey",
        deviceId: credId,
        name: siteName.value.trim() || "Passkey User",
        country: siteCountry.value,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      siteAuthStatus.textContent = "";
      saveSession({ token: data.token, user: data.user });
    }
  } catch (_) {
    siteAuthStatus.textContent = "Биометрия отменена. Можно войти через Google или в 1 клик.";
  }
});

// Email Submit
authSubmitBtn.addEventListener("click", async () => {
  siteAuthStatus.textContent = "Подключаюсь к Стелла Cloud...";
  try {
    const res = await fetch(`${CLOUD_API}/api/auth/${authMode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: siteName.value.trim(),
        email: siteEmail.value.trim(),
        password: sitePass.value,
        country: siteCountry.value,
        consent: siteConsent.checked,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      siteAuthStatus.textContent = data.error || "Ошибка авторизации";
      return;
    }
    siteAuthStatus.textContent = "";
    saveSession({ token: data.token, user: data.user });
  } catch (e) {
    siteAuthStatus.textContent = "Ошибка сети: " + String(e.message || e);
  }
});

siteLogoutBtn.addEventListener("click", () => saveSession(null));

// =========================================================
// DASHBOARD: CLOUD TASKS + 24 FACTORY MCPS
// =========================================================
async function loadMcpCatalog() {
  if (mcpCatalog.length) {
    renderMcpCatalog();
    return;
  }
  try {
    const res = await fetch(`${CLOUD_API}/api/mcp/catalog`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.catalog)) {
      mcpCatalog = data.catalog;
      renderMcpCatalog();
    }
  } catch (_) {}
}

function renderMcpCatalog() {
  const connectedIds = new Set((session?.user?.connectors || []).map((c) => c.id));
  const filtered = mcpCatalog.filter((item) => {
    if (activeCat === "all") return true;
    if (activeCat === "builtin") return item.mode === "builtin";
    return item.cat === activeCat;
  });

  mcpCatalogGrid.innerHTML = "";
  filtered.forEach((item) => {
    const isConnected = connectedIds.has(item.id);
    const card = document.createElement("div");
    card.className = "mcp-card";
    card.innerHTML = `
      <div>
        <div class="mcp-card-head">
          <span class="mcp-card-title">${escapeHtml(item.name)}</span>
          <span class="mcp-badge ${item.mode === "builtin" ? "free" : ""}">${escapeHtml(item.badge)}</span>
        </div>
        <p class="mcp-card-desc" style="margin-top:6px;">${escapeHtml(item.desc)}</p>
        ${
          item.mode !== "builtin" && !isConnected
            ? `<div class="mcp-card-fields">
                 <input type="text" data-f1 placeholder="${escapeHtml(item.field1 || "URL / Token")}" />
                 ${item.field2 ? `<input type="text" data-f2 placeholder="${escapeHtml(item.field2)}" />` : ""}
               </div>`
            : ""
        }
      </div>
      <div style="display:flex;gap:6px;margin-top:4px;">
        <button class="btn-small ${isConnected ? "" : "primary"}" data-connect-id="${item.id}" style="flex:1;padding:6px 10px;font-size:12px;">
          ${isConnected ? "Отключить" : "Подключить"}
        </button>
        <button class="btn-small" data-use-role="${item.role || "manus"}" style="padding:6px 10px;font-size:12px;">Агент</button>
      </div>
    `;

    card.querySelector("[data-use-role]").addEventListener("click", () => {
      if (cloudAgentRole && item.role) cloudAgentRole.value = item.role;
      document.querySelector('#wsTabs .ws-tab[data-ws="agents"]')?.click();
      cloudPrompt?.focus();
    });

    card.querySelector("[data-connect-id]").addEventListener("click", async () => {
      const current = [...(session.user.connectors || [])];
      if (isConnected) {
        await updateConnectors(current.filter((c) => c.id !== item.id));
        return;
      }
      const entry = { id: item.id, name: item.name, type: item.mode, mode: item.mode, enabled: true };
      if (item.mode !== "builtin") {
        const f1 = card.querySelector("[data-f1]")?.value?.trim() || "";
        const f2 = card.querySelector("[data-f2]")?.value?.trim() || "";
        if (!f1) { card.querySelector("[data-f1]")?.focus(); return; }
        if (item.mode === "telegram") { entry.botToken = f1; entry.chatId = f2; }
        else if (item.mode === "whatsapp") { entry.phoneId = f1; entry.accessToken = f2; }
        else if (item.mode === "discord" || item.mode === "webhook") { entry.webhookUrl = f1; entry.apiKey = f2; }
        else { entry.endpoint = f1; entry.apiKey = f2; }
      }
      current.push(entry);
      await updateConnectors(current);
    });
    mcpCatalogGrid.appendChild(card);
  });
}

mcpFilterTabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    mcpFilterTabs.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeCat = btn.getAttribute("data-cat") || "all";
    renderMcpCatalog();
  });
});

async function updateConnectors(connectors) {
  const res = await fetch(`${CLOUD_API}/api/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Stella-Token": session.token },
    body: JSON.stringify({ connectors }),
  });
  const data = await res.json();
  if (data.ok && data.user) saveSession({ ...session, user: data.user });
}

function renderConnectors() {
  const list = session?.user?.connectors || [];
  if (!list.length) {
    connsList.innerHTML = `<div class="task-item"><p>Нет подключённых MCP.</p></div>`;
    return;
  }
  connsList.innerHTML = list
    .map(
      (c, i) => `
      <div class="task-item" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div>
          <strong>${escapeHtml(c.name)}</strong>
          <p>${escapeHtml(c.mode === "builtin" ? "Бесплатный встроенный MCP" : c.endpoint || c.webhookUrl || "Активно")}</p>
        </div>
        <button class="btn-small" data-del-conn="${i}" style="padding:4px 9px;font-size:11.5px;">×</button>
      </div>`
    )
    .join("");

  connsList.querySelectorAll("[data-del-conn]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.getAttribute("data-del-conn"));
      await updateConnectors((session.user.connectors || []).filter((_, i) => i !== idx));
    });
  });
}

async function loadCloudTasks() {
  if (!session?.token) return;
  try {
    const res = await fetch(`${CLOUD_API}/api/cloud-tasks`, {
      headers: { "X-Stella-Token": session.token },
    });
    const data = await res.json();
    const tasks = data.tasks || [];
    if (!tasks.length) {
      cloudTasksList.innerHTML = `<div class="task-item"><p>Облачных задач пока нет. Напишите задачу слева.</p></div>`;
      return;
    }
    cloudTasksList.innerHTML = tasks
      .map(
        (t) => `
        <div class="task-item">
          <strong>[${escapeHtml((t.agentRole || "manus").toUpperCase())}] ${escapeHtml(t.prompt)}</strong>
          <p>${escapeHtml(t.result)}</p>
        </div>`
      )
      .join("");
  } catch (_) {}
}

runCloudTaskBtn?.addEventListener("click", async () => {
  const prompt = cloudPrompt.value.trim();
  if (!prompt || !session?.token) return;
  runCloudTaskBtn.disabled = true;
  runCloudTaskBtn.textContent = "Агент работает в облаке...";
  try {
    const res = await fetch(`${CLOUD_API}/api/cloud-tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Stella-Token": session.token },
      body: JSON.stringify({ prompt, agentRole: cloudAgentRole?.value || "manus" }),
    });
    const data = await res.json();
    if (data.ok) {
      cloudPrompt.value = "";
      await loadCloudTasks();
    }
  } finally {
    runCloudTaskBtn.disabled = false;
    runCloudTaskBtn.textContent = "Запустить в облаке";
  }
});

function renderUI() {
  if (!session?.token || !session?.user) {
    authView.classList.remove("hidden");
    dashView.classList.add("hidden");
    headerUserChip.textContent = "Личный кабинет";
    return;
  }

  authView.classList.add("hidden");
  dashView.classList.remove("hidden");
  headerUserChip.textContent = session.user.name || "Профиль";

  const regionNames = { KZ: "🇰🇿 Казахстан", RU: "🇷🇺 Россия", OTHER: "🌍 Global" };
  dashUserTitle.textContent = session.user.name;
  dashUserMeta.textContent = `${session.user.email} • ${regionNames[session.user.country] || session.user.country}`;
  dashPresets.innerHTML = (session.user.presets || [])
    .map((p) => `<span class="preset-chip">${escapeHtml(p)}</span>`)
    .join("");

  renderConnectors();
  loadMcpCatalog();
  loadCloudTasks();
}

renderUI();
