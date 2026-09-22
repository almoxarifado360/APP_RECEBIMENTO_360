const API_URL = "https://script.google.com/macros/s/AKfycbw3B8ZLc22bcc1HIAVvoaDguRzlupuixrp5Mka5667VHQF9oIvmEeRpqvuqEJMzRXMK/exec";
const screens = ["home", "new", "day", "history"];

function showScreen(id) {
  screens.forEach(screen => {
    const el = document.getElementById(screen);
    if (el) el.classList.toggle("active", screen === id);
  });
  document.querySelectorAll("[data-screen]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.screen === id && btn.classList.contains("menu-btn"));
  });
  window.scrollTo({top:0, behavior:"smooth"});
  if (id === "home") loadLatest();
  if (id === "day") loadToday();
  if (id === "new") prepareNewReceipt();
}

async function apiGet(action, params={}) {
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([key,value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key,value);
  });
  const response = await fetch(url.toString());
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "Erro na API.");
  return data.data;
}

async function apiPost(payload) {
  const body = new URLSearchParams();
  body.set("payload", JSON.stringify(payload));
  const response = await fetch(API_URL, {method:"POST", body});
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "Erro na API.");
  return data.data;
}

function prepareNewReceipt() {
  const date = document.getElementById("receiptDate");
  if (date && !date.value) {
    const now = new Date();
    date.value = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,10);
  }
  const container = document.getElementById("itemsContainer");
  if (container && !container.children.length) addItem();
}

function addItem() {
  const container = document.getElementById("itemsContainer");
  if (!container) return;

  const index = container.children.length + 1;
  const card = document.createElement("div");
  card.className = "item-card";
  card.innerHTML = `
    <div class="item-card-header">
      <span class="item-number">Material ${index}</span>
      ${index > 1 ? '<button class="remove-item" type="button">Remover</button>' : ''}
    </div>
    <div class="item-grid">
      <input class="field-input item-description" type="text" placeholder="Descrição do material">
      <input class="field-input item-quantity" type="number" min="0" step="1" inputmode="numeric" placeholder="Qtd.">
    </div>
    <select class="field-input item-destination item-destination" aria-label="Destino">
      <option value="">Destino do material</option>
      <option>Estoque</option>
      <option>Automação</option>
      <option>Hidráulica</option>
      <option>Oficina</option>
      <option>Expedição</option>
      <option>OS</option>
      <option>Tarefa</option>
      <option>Cliente</option>
      <option>Outro</option>
    </select>
    <div class="item-extra"></div>
  `;

  container.appendChild(card);

  const destination = card.querySelector(".item-destination");
  destination.addEventListener("change", () => updateDestinationFields(card));

  const remove = card.querySelector(".remove-item");
  if (remove) {
    remove.addEventListener("click", () => {
      card.remove();
      renumberItems();
    });
  }
}

function updateDestinationFields(card) {
  const destination = card.querySelector(".item-destination").value;
  const extra = card.querySelector(".item-extra");
  extra.innerHTML = "";

  if (destination === "OS") {
    extra.innerHTML = '<input class="field-input item-os" type="text" inputmode="numeric" placeholder="Número da OS">';
  } else if (destination === "Tarefa") {
    extra.innerHTML = '<input class="field-input item-task" type="text" inputmode="numeric" placeholder="Número da tarefa">';
  } else if (destination === "Cliente") {
    extra.innerHTML = '<input class="field-input item-client" type="text" placeholder="Nome do cliente">';
  }
}

function renumberItems() {
  document.querySelectorAll("#itemsContainer .item-card").forEach((card, i) => {
    card.querySelector(".item-number").textContent = `Material ${i+1}`;
    const remove = card.querySelector(".remove-item");
    if (i === 0 && remove) remove.remove();
  });
}

async function saveReceipt() {
  const status = document.getElementById("saveStatus");
  const button = document.getElementById("saveReceiptBtn");
  status.className = "form-status";
  status.textContent = "";

  const nfe = document.getElementById("receiptNfe").value.trim();
  const supplier = document.getElementById("receiptSupplier").value.trim();
  const dateValue = document.getElementById("receiptDate").value;
  const receivedBy = document.getElementById("receivedBy").value.trim();
  const observation = document.getElementById("observation").value.trim();

  if (!nfe) {
    status.className = "form-status error";
    status.textContent = "Informe o número da NF-e.";
    return;
  }

  const items = [...document.querySelectorAll("#itemsContainer .item-card")].map(card => ({
    description: card.querySelector(".item-description").value.trim(),
    quantity: Number(card.querySelector(".item-quantity").value || 0),
    destination: card.querySelector(".item-destination").value,
    os: card.querySelector(".item-os")?.value.trim() || "",
    task: card.querySelector(".item-task")?.value.trim() || "",
    client: card.querySelector(".item-client")?.value.trim() || ""
  }));

  const invalid = items.some(item => !item.description || item.quantity <= 0 || !item.destination);
  if (invalid) {
    status.className = "form-status error";
    status.textContent = "Preencha descrição, quantidade e destino de todos os materiais.";
    return;
  }

  const date = dateValue ? dateValue.split("-").reverse().join("/") : "";

  button.classList.add("loading-btn");
  button.textContent = "⏳ Salvando...";

  try {
    await apiPost({
      action: "saveReceipt",
      receipt: { date, nfe, supplier, items, receivedBy, observation }
    });

    status.className = "form-status success";
    status.textContent = "Recebimento salvo com sucesso!";

    document.getElementById("receiptNfe").value = "";
    document.getElementById("receiptSupplier").value = "";
    document.getElementById("receivedBy").value = "";
    document.getElementById("observation").value = "";
    document.getElementById("itemsContainer").innerHTML = "";
    prepareNewReceipt();

    setTimeout(() => showScreen("home"), 800);
  } catch (error) {
    status.className = "form-status error";
    status.textContent = "Não foi possível salvar: " + error.message;
  } finally {
    button.classList.remove("loading-btn");
    button.textContent = "✅ Finalizar recebimento";
  }
}

async function loadLatest() {
  const list = document.getElementById("latestList");
  if (!list) return;
  list.innerHTML = '<div class="empty-state"><span>⏳</span><strong>Carregando recebimentos...</strong></div>';
  try { renderLatest(await apiGet("latest")); }
  catch (error) { list.innerHTML = '<div class="empty-state"><span>⚠️</span><strong>Não foi possível carregar os recebimentos</strong><small>'+escapeHtml(error.message)+'</small></div>'; }
}

async function loadToday() {
  const screen = document.getElementById("day");
  if (!screen) return;
  const card = screen.querySelector(".section-card");
  card.innerHTML = '<h2>Recebimentos do dia</h2><div class="empty-state compact"><span>⏳</span><strong>Carregando...</strong></div>';
  try {
    const receipts = await apiGet("today");
    if (!receipts.length) {
      card.innerHTML = '<h2>Recebimentos do dia</h2><div class="empty-state compact"><span>📋</span><strong>Nenhum recebimento hoje</strong></div>';
      return;
    }
    card.innerHTML = '<h2>Recebimentos do dia</h2><div class="receipt-list">'+receipts.map(receiptCard).join("")+'</div>';
  } catch (error) {
    card.innerHTML = '<h2>Recebimentos do dia</h2><div class="empty-state compact"><span>⚠️</span><strong>Erro ao consultar</strong><small>'+escapeHtml(error.message)+'</small></div>';
  }
}

function renderLatest(receipts=[]) {
  const list = document.getElementById("latestList");
  if (!receipts.length) {
    list.innerHTML = '<div class="empty-state"><span>📦</span><strong>Nenhum recebimento registrado ainda</strong><small>Os últimos recebimentos aparecerão aqui.</small></div>';
    return;
  }
  list.innerHTML = receipts.slice(0,5).map(receiptCard).join("");
}

function receiptCard(receipt) {
  const count = Array.isArray(receipt.items) ? receipt.items.length : 0;
  return '<button class="receipt-item" type="button"><div class="receipt-main"><div><div class="receipt-nfe">NF-e '+escapeHtml(receipt.nfe || '')+'</div><div class="receipt-supplier">'+escapeHtml(receipt.supplier || 'Fornecedor não informado')+'</div><div class="receipt-meta">'+count+' '+(count===1?'material':'materiais')+' · '+escapeHtml(receipt.destination || 'Destino não informado')+'</div></div><div class="receipt-date">'+escapeHtml(receipt.date || '')+'</div></div></button>';
}

document.addEventListener("click", event => {
  const target = event.target.closest("[data-screen]");
  if (target) showScreen(target.dataset.screen);
});

document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("addItemBtn");
  if (addBtn) addBtn.addEventListener("click", addItem);
  const saveBtn = document.getElementById("saveReceiptBtn");
  if (saveBtn) saveBtn.addEventListener("click", saveReceipt);
  showScreen("home");
});

function escapeHtml(value) {
  return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
