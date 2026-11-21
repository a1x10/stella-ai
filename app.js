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

copyUrlBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(currentUrl);
    const old = copyUrlBtn.textContent;
    copyUrlBtn.textContent = "Скопировано!";
    setTimeout(() => {
      copyUrlBtn.textContent = old;
    }, 1600);
  } catch (_) {}
});
