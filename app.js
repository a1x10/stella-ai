const CLOUD_API = "https://stella-openrouter-proxy.stella-ai-a1x10.workers.dev";

const BROWSER_DATA = {
  chrome: { url: "chrome://extensions", label: "Google Chrome" },
  edge: { url: "edge://extensions", label: "Microsoft Edge" },
  yandex: { url: "browser://tune", label: "Яндекс.Браузер" },
  brave: { url: "brave://extensions", label: "Brave" },
  opera: { url: "opera://extensions", label: "Opera" },
};

let currentUrl = "chrome://extensions";
const tabs = document.querySelectorAll(".b-tab");
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
// STELLA CLOUD AUTH, PROFILE, MCP HUB & 24/7 CLOUD AGENTS
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
const cloudPrompt = document.getElementById("cloudPrompt");
const runCloudTaskBtn = document.getElementById("runCloudTaskBtn");
const cloudTasksList = document.getElementById("cloudTasksList");

const connType = document.getElementById("connType");
const connName = document.getElementById("connName");
const connField1 = document.getElementById("connField1");
const connField2 = document.getElementById("connField2");
const addConnBtn = document.getElementById("addConnBtn");
const connsList = document.getElementById("connsList");

let session = null;
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
  loadCloudTasks();
}

function renderConnectors() {
  const list = session?.user?.connectors || [];
  if (!list.length) {
    connsList.innerHTML = `<div class="task-item"><p>Нет подключённых MCP / ботов. Добавьте Telegram, Discord или URL вашего MCP-сервера.</p></div>`;
    return;
  }
  connsList.innerHTML = list
    .map(
      (c, i) => `
      <div class="task-item">
        <strong>${escapeHtml(c.name)} (${escapeHtml(c.type.toUpperCase())})</strong>
        <p>${escapeHtml(c.endpoint || c.webhookUrl || (c.chatId ? "Chat ID: " + c.chatId : "Подключено"))}</p>
        <button class="btn-small" data-del-conn="${i}" style="margin-top:6px;padding:4px 10px;font-size:11.5px;">Отключить</button>
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
      cloudTasksList.innerHTML = `<div class="task-item"><p>Облачных задач пока нет. Напишите задачу выше — она выполнится на сервере 24/7.</p></div>`;
      return;
    }
    cloudTasksList.innerHTML = tasks
      .map(
        (t) => `
        <div class="task-item">
          <strong>${escapeHtml(t.prompt)}</strong>
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
  runCloudTaskBtn.textContent = "Выполняю в облаке...";
  try {
    const res = await fetch(`${CLOUD_API}/api/cloud-tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Stella-Token": session.token,
      },
      body: JSON.stringify({ prompt }),
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

addConnBtn?.addEventListener("click", async () => {
  const type = connType.value;
  const name = connName.value.trim() || type.toUpperCase();
  const f1 = connField1.value.trim();
  const f2 = connField2.value.trim();
  if (!f1) return;

  const entry = { type, name, enabled: true };
  if (type === "mcp") {
    entry.endpoint = f1;
    entry.apiKey = f2;
  } else if (type === "telegram") {
    entry.botToken = f1;
    entry.chatId = f2;
  } else if (type === "discord") {
    entry.webhookUrl = f1;
  }

  const next = [...(session.user.connectors || []), entry];
  await updateProfileConnectors(next);
  connName.value = "";
  connField1.value = "";
  connField2.value = "";
});

renderCloudUI();
