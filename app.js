const CLOUD_API = "https://stella-openrouter-proxy.stella-ai-a1x10.workers.dev";

const BROWSER_DATA = {
  chrome: { url: "chrome://extensions", label: "Google Chrome" },
  edge: { url: "edge://extensions", label: "Microsoft Edge" },
  yandex: { url: "browser://tune", label: "Яндекс.Браузер" },
  brave: { url: "brave://extensions", label: "Brave" },
  opera: { url: "opera://extensions", label: "Opera" },
};

let currentUrl = "chrome://extensions";
const tabs = document.querySelectorAll("#browserTabs .b-tab");
const extUrlEl = document.getElementById("extUrl");
const copyUrlBtn = document.getElementById("copyUrlBtn");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const info = BROWSER_DATA[tab.dataset.browser] || BROWSER_DATA.chrome;
    currentUrl = info.url;
    extUrlEl.textContent = currentUrl;
    copyUrlBtn.textContent = `Скопировать ${currentUrl}`;
  });
});

copyUrlBtn?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(currentUrl);
    const old = copyUrlBtn.textContent;
    copyUrlBtn.textContent = "Скопировано!";
    setTimeout(() => { copyUrlBtn.textContent = old; }, 1600);
  } catch (_) {}
});

// =========================================================
// STELLA CLOUD AUTH, PROFILE, FACTORY MCP STORE & 24/7 AGENTS
// =========================================================
const navProfileBtn = document.getElementById("navProfileBtn");
const authPanel = document.getElementById("authPanel");
const dashPanel = document.getElementById("dashPanel");
const siteName = document.getElementById("siteName");
const siteEmail = document.getElementById("siteEmail");
const sitePass = document.getElementById("sitePass");
const siteCountry = document.getElementById("siteCountry");
const siteConsent = document.getElementById("siteConsent");
const siteRegBtn = document.getElementById("siteRegBtn");
const siteLoginBtn = document.getElementById("siteLoginBtn");
const siteLogoutBtn = document.getElementById("siteLogoutBtn");
const siteAuthStatus = document.getElementById("siteAuthStatus");

const dashUserTitle = document.getElementById("dashUserTitle");
const dashUserMeta = document.getElementById("dashUserMeta");
const dashPresets = document.getElementById("dashPresets");
const cloudAgentRole = document.getElementById("cloudAgentRole");
const cloudPrompt = document.getElementById("cloudPrompt");
const runCloudTaskBtn = document.getElementById("runCloudTaskBtn");
const cloudTasksList = document.getElementById("cloudTasksList");
const connsList = document.getElementById("connsList");
const mcpCatalogGrid = document.getElementById("mcpCatalogGrid");
const mcpFilterTabs = document.querySelectorAll("#mcpFilterTabs .b-tab");

let session = null;
let mcpCatalog = [];
let activeCat = "all";

try {
  session = JSON.parse(localStorage.getItem("stella_cloud_session") || "null");
} catch (_) {}

function saveSession(s) {
  session = s;
  if (s) localStorage.setItem("stella_cloud_session", JSON.stringify(s));
  else localStorage.removeItem("stella_cloud_session");
  renderCloudUI();
}

function escapeHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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
  if (!mcpCatalogGrid) return;
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
          ${isConnected ? "✓ Подключено" : "Подключить"}
        </button>
        <button class="btn-small" data-use-role="${item.role || "manus"}" style="padding:6px 10px;font-size:12px;" title="Выбрать этого агента">Агент</button>
      </div>
    `;

    card.querySelector("[data-use-role]").addEventListener("click", () => {
      if (cloudAgentRole && item.role) cloudAgentRole.value = item.role;
      cloudPrompt?.focus();
    });

    card.querySelector("[data-connect-id]").addEventListener("click", async () => {
      const current = [...(session.user.connectors || [])];
      if (isConnected) {
        const next = current.filter((c) => c.id !== item.id);
        await updateProfileConnectors(next);
        return;
      }

      const entry = {
        id: item.id,
        name: item.name,
        type: item.mode,
        mode: item.mode,
        enabled: true,
      };

      if (item.mode !== "builtin") {
        const f1 = card.querySelector("[data-f1]")?.value?.trim() || "";
        const f2 = card.querySelector("[data-f2]")?.value?.trim() || "";
        if (!f1) {
          card.querySelector("[data-f1]")?.focus();
          return;
        }
        if (item.mode === "telegram") {
          entry.botToken = f1;
          entry.chatId = f2;
        } else if (item.mode === "whatsapp") {
          entry.phoneId = f1;
          entry.accessToken = f2;
        } else if (item.mode === "discord" || item.mode === "webhook") {
          entry.webhookUrl = f1;
          entry.apiKey = f2;
        } else {
          entry.endpoint = f1;
          entry.apiKey = f2;
        }
      }

      current.push(entry);
      await updateProfileConnectors(current);
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

function renderCloudUI() {
  if (!session?.token || !session?.user) {
    authPanel?.classList.remove("hidden");
    dashPanel?.classList.add("hidden");
    if (navProfileBtn) navProfileBtn.textContent = "Войти";
    return;
  }

  authPanel?.classList.add("hidden");
  dashPanel?.classList.remove("hidden");
  if (navProfileBtn) navProfileBtn.textContent = session.user.name || "Профиль";

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

function renderConnectors() {
  const list = session?.user?.connectors || [];
  if (!list.length) {
    connsList.innerHTML = `<div class="task-item"><p>Выберите любые заводские MCP в каталоге ниже.</p></div>`;
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
      const next = (session.user.connectors || []).filter((_, i) => i !== idx);
      await updateProfileConnectors(next);
    });
  });
}

async function updateProfileConnectors(connectors) {
  const res = await fetch(`${CLOUD_API}/api/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Stella-Token": session.token,
    },
    body: JSON.stringify({ connectors }),
  });
  const data = await res.json();
  if (data.ok && data.user) {
    saveSession({ ...session, user: data.user });
  }
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
      cloudTasksList.innerHTML = `<div class="task-item"><p>Выберите агента сверху и отправьте задачу — она выполнится в облаке 24/7.</p></div>`;
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

async function doAuth(mode) {
  siteAuthStatus.textContent = "Подключаюсь к Stella Cloud...";
  try {
    const res = await fetch(`${CLOUD_API}/api/auth/${mode}`, {
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
}

siteRegBtn?.addEventListener("click", () => doAuth("register"));
siteLoginBtn?.addEventListener("click", () => doAuth("login"));
siteLogoutBtn?.addEventListener("click", () => saveSession(null));

document.querySelectorAll(".oauth-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const prov = btn.getAttribute("data-oauth");
    siteAuthStatus.textContent = `OAuth через ${prov} готов к привязке Client ID в Cloudflare Worker. Пока можно мгновенно войти по Email ниже.`;
  });
});

runCloudTaskBtn?.addEventListener("click", async () => {
  const prompt = cloudPrompt.value.trim();
  if (!prompt || !session?.token) return;
  runCloudTaskBtn.disabled = true;
  runCloudTaskBtn.textContent = "Агент работает в облаке...";
  try {
    const res = await fetch(`${CLOUD_API}/api/cloud-tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Stella-Token": session.token,
      },
      body: JSON.stringify({
        prompt,
        agentRole: cloudAgentRole?.value || "manus",
      }),
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

renderCloudUI();
