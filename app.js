const screens = ["home", "new", "day", "history"];

function showScreen(id) {
  screens.forEach(screen => {
    const el = document.getElementById(screen);
    if (el) el.classList.toggle("active", screen === id);
  });

  document.querySelectorAll("[data-screen]").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.screen === id && btn.classList.contains("menu-btn")
    );
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("click", event => {
  const target = event.target.closest("[data-screen]");
  if (!target) return;

  showScreen(target.dataset.screen);
});

// Estrutura inicial. Depois conectaremos esta função ao Google Apps Script.
function renderLatest(receipts = []) {
  const list = document.getElementById("latestList");

  if (!receipts.length) {
    list.innerHTML = `
      <div class="empty-state">
        <span>📦</span>
        <strong>Nenhum recebimento registrado ainda</strong>
        <small>Os últimos recebimentos aparecerão aqui.</small>
      </div>
    `;
    return;
  }

  list.innerHTML = receipts.slice(0, 5).map(receipt => `
    <button class="receipt-item">
      <div class="receipt-main">
        <div>
          <div class="receipt-nfe">NF-e ${escapeHtml(receipt.nfe || "")}</div>
          <div class="receipt-supplier">${escapeHtml(receipt.supplier || "")}</div>
          <div class="receipt-meta">
            ${receipt.items || 0} materiais · ${escapeHtml(receipt.destination || "—")}
          </div>
        </div>
        <div class="receipt-date">${escapeHtml(receipt.date || "")}</div>
      </div>
    </button>
  `).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

showScreen("home");
