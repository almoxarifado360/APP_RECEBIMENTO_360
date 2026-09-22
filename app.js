const API_URL = "https://script.google.com/macros/s/AKfycbw3B8ZLc22bcc1HIAVvoaDguRzlupuixrp5Mka5667VHQF9oIvmEeRpqvuqEJMzRXMK/exec";
const screens = ["home", "new", "day", "history"];

function showScreen(id) {
  screens.forEach(screen => {
    const el = document.getElementById(screen);
    if (el) el.classList.toggle("active", screen === id);
  });

  document.querySelectorAll("[data-screen]").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.screen === id &&
      btn.classList.contains("menu-btn")
    );
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (id === "home") loadLatest();
  if (id === "day") loadToday();
  if (id === "new") prepareNewReceipt();
}


/* =========================================================
   API
   ========================================================= */

async function apiGet(action, params = {}) {
  const url = new URL(API_URL);

  url.searchParams.set("action", action);

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!data.ok) {
    throw new Error(
      data.error || "Erro na API."
    );
  }

  return data.data;
}


async function apiPost(payload) {
  const body = new URLSearchParams();

  body.set(
    "payload",
    JSON.stringify(payload)
  );

  const response = await fetch(
    API_URL,
    {
      method: "POST",
      body
    }
  );

  const data = await response.json();

  if (!data.ok) {
    throw new Error(
      data.error || "Erro na API."
    );
  }

  return data.data;
}


/* =========================================================
   NOVO RECEBIMENTO
   ========================================================= */

function prepareNewReceipt() {
  const date =
    document.getElementById("receiptDate");

  if (date && !date.value) {
    const now = new Date();

    date.value =
      new Date(
        now.getTime() -
        now.getTimezoneOffset() * 60000
      )
      .toISOString()
      .slice(0, 10);
  }

  const container =
    document.getElementById(
      "itemsContainer"
    );

  if (
    container &&
    !container.children.length
  ) {
    addItem();
  }
}


/* =========================================================
   ITENS
   ========================================================= */

function addItem(data = {}) {
  const container =
    document.getElementById(
      "itemsContainer"
    );

  if (!container) return;

  const index =
    container.children.length + 1;

  const card =
    document.createElement("div");

  card.className = "item-card";

  card.innerHTML = `
    <div class="item-card-header">
      <span class="item-number">
        Material ${index}
      </span>

      ${
        index > 1
          ? '<button class="remove-item" type="button">Remover</button>'
          : ''
      }
    </div>

    <div class="item-grid">
      <input
        class="field-input item-description"
        type="text"
        placeholder="Descrição do material"
      >

      <input
        class="field-input item-quantity"
        type="number"
        min="0"
        step="1"
        inputmode="numeric"
        placeholder="Qtd."
      >
    </div>

    <select
      class="field-input item-destination"
      aria-label="Destino"
    >
      <option value="">
        Destino do material
      </option>

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

  const description =
    card.querySelector(
      ".item-description"
    );

  const quantity =
    card.querySelector(
      ".item-quantity"
    );

  if (data.description) {
    description.value =
      data.description;
  }

  if (
    data.quantity !== undefined &&
    data.quantity !== null
  ) {
    quantity.value =
      data.quantity;
  }

  const destination =
    card.querySelector(
      ".item-destination"
    );

  destination.addEventListener(
    "change",
    () => updateDestinationFields(card)
  );

  const remove =
    card.querySelector(
      ".remove-item"
    );

  if (remove) {
    remove.addEventListener(
      "click",
      () => {
        card.remove();
        renumberItems();
      }
    );
  }
}


function updateDestinationFields(card) {
  const destination =
    card.querySelector(
      ".item-destination"
    ).value;

  const extra =
    card.querySelector(
      ".item-extra"
    );

  extra.innerHTML = "";

  if (destination === "OS") {

    extra.innerHTML = `
      <input
        class="field-input item-os"
        type="text"
        inputmode="numeric"
        placeholder="Número da OS"
      >
    `;

  } else if (
    destination === "Tarefa"
  ) {

    extra.innerHTML = `
      <input
        class="field-input item-task"
        type="text"
        inputmode="numeric"
        placeholder="Número da tarefa"
      >
    `;

  } else if (
    destination === "Cliente"
  ) {

    extra.innerHTML = `
      <input
        class="field-input item-client"
        type="text"
        placeholder="Nome do cliente"
      >
    `;
  }
}


function renumberItems() {
  document
    .querySelectorAll(
      "#itemsContainer .item-card"
    )
    .forEach((card, i) => {

      const number =
        card.querySelector(
          ".item-number"
        );

      if (number) {
        number.textContent =
          `Material ${i + 1}`;
      }

      const remove =
        card.querySelector(
          ".remove-item"
        );

      if (
        i === 0 &&
        remove
      ) {
        remove.remove();
      }
    });
}


/* =========================================================
   LEITURA DA NF-e COM GEMINI
   ========================================================= */

function findNfImageInput() {

  const ids = [
    "nfImage",
    "nfeImage",
    "nfPhoto",
    "nfePhoto",
    "nfImageInput",
    "nfeImageInput",
    "photoNf",
    "photoNfe"
  ];

  for (const id of ids) {

    const element =
      document.getElementById(id);

    if (element) {
      return element;
    }
  }

  return document.querySelector(
    'input[type="file"]'
  );
}


function findReadNfButton() {

  const ids = [
    "readNfBtn",
    "readNfeBtn",
    "lerNfBtn",
    "lerNfeBtn"
  ];

  for (const id of ids) {

    const element =
      document.getElementById(id);

    if (element) {
      return element;
    }
  }

  const buttons =
    document.querySelectorAll(
      "button"
    );

  for (const button of buttons) {

    const text =
      button.textContent
        .trim()
        .toLowerCase();

    if (
      text.includes("ler nf-e") ||
      text.includes("ler nfe") ||
      text.includes("ler nf")
    ) {
      return button;
    }
  }

  return null;
}


/*
 * Converte a foto para JPEG menor antes
 * de enviar ao Gemini.
 */

function resizeImageForAI(
  file,
  maxWidth = 1800
) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload = event => {

        const image =
          new Image();

        image.onload = () => {

          let width =
            image.width;

          let height =
            image.height;

          if (
            width > maxWidth
          ) {

            const ratio =
              maxWidth / width;

            width =
              maxWidth;

            height =
              Math.round(
                height * ratio
              );
          }

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width =
            width;

          canvas.height =
            height;

          const context =
            canvas.getContext(
              "2d"
            );

          context.drawImage(
            image,
            0,
            0,
            width,
            height
          );

          canvas.toBlob(
            blob => {

              if (!blob) {
                reject(
                  new Error(
                    "Não foi possível processar a imagem."
                  )
                );
                return;
              }

              const blobReader =
                new FileReader();

              blobReader.onload =
                () => {

                  const result =
                    blobReader.result;

                  resolve({
                    base64:
                      result.split(",")[1],

                    mimeType:
                      "image/jpeg"
                  });
                };

              blobReader.onerror =
                () => reject(
                  new Error(
                    "Erro ao preparar a imagem."
                  )
                );

              blobReader.readAsDataURL(
                blob
              );
            },
            "image/jpeg",
            0.82
          );
        };

        image.onerror =
          () => reject(
            new Error(
              "Não foi possível abrir a imagem."
            )
          );

        image.src =
          event.target.result;
      };

      reader.onerror =
        () => reject(
          new Error(
            "Não foi possível ler a foto."
          )
        );

      reader.readAsDataURL(file);
    }
  );
}


async function readNfImage() {

  const input =
    findNfImageInput();

  const button =
    findReadNfButton();

  if (!input) {

    alert(
      "Campo da foto da NF-e não encontrado."
    );

    return;
  }

  if (
    !input.files ||
    !input.files.length
  ) {

    alert(
      "Primeiro tire ou selecione uma foto da NF-e."
    );

    return;
  }

  const file =
    input.files[0];

  const originalText =
    button
      ? button.textContent
      : "";

  if (button) {

    button.disabled = true;

    button.textContent =
      "⏳ Lendo NF-e...";
  }

  try {

    const image =
      await resizeImageForAI(
        file
      );

    const result =
      await apiPost({
        action:
          "parseNfImage",

        base64:
          image.base64,

        mimeType:
          image.mimeType
      });

    applyNfData(result);

    showNfReadSuccess();

  } catch (error) {

    console.error(
      "Erro ao ler NF-e:",
      error
    );

    showNfReadError(
      error.message
    );

  } finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        originalText ||
        "📖 Ler NF-e";
    }
  }
}


/* =========================================================
   APLICAR DADOS RETORNADOS PELO GEMINI
   ========================================================= */

function applyNfData(data) {

  if (!data) {
    throw new Error(
      "O Gemini não retornou dados da NF-e."
    );
  }

  const nfe =
    document.getElementById(
      "receiptNfe"
    );

  const supplier =
    document.getElementById(
      "receiptSupplier"
    );

  const date =
    document.getElementById(
      "receiptDate"
    );

  if (nfe) {
    nfe.value =
      data.nfe || "";
  }

  if (supplier) {
    supplier.value =
      data.supplier || "";
  }

  if (
    date &&
    data.date
  ) {

    const parts =
      String(data.date)
        .split("/");

    if (
      parts.length === 3
    ) {

      date.value =
        `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  const container =
    document.getElementById(
      "itemsContainer"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const items =
    Array.isArray(data.items)
      ? data.items
      : [];

  if (!items.length) {

    addItem();

    return;
  }

  items.forEach(item => {

    addItem({
      description:
        item.description || "",

      quantity:
        Number(item.quantity) || 0
    });

  });

  renumberItems();
}


/* =========================================================
   MENSAGENS DA LEITURA
   ========================================================= */

function showNfReadSuccess() {

  let status =
    document.getElementById(
      "nfReadStatus"
    );

  if (!status) {

    const input =
      findNfImageInput();

    if (input) {

      status =
        document.createElement(
          "div"
        );

      status.id =
        "nfReadStatus";

      status.className =
        "form-status success";

      input.parentElement
        ?.appendChild(status);
    }
  }

  if (status) {

    status.className =
      "form-status success";

    status.textContent =
      "✅ NF-e lida. Confira os dados antes de finalizar.";
  }
}


function showNfReadError(message) {

  let status =
    document.getElementById(
      "nfReadStatus"
    );

  if (!status) {

    const input =
      findNfImageInput();

    if (input) {

      status =
        document.createElement(
          "div"
        );

      status.id =
        "nfReadStatus";

      status.className =
        "form-status error";

      input.parentElement
        ?.appendChild(status);
    }
  }

  if (status) {

    status.className =
      "form-status error";

    status.textContent =
      "⚠️ Não foi possível ler a NF-e: " +
      message;
  }
}


/* =========================================================
   FOTOS DO RECEBIMENTO
   ========================================================= */

function findFileInputByIds(ids) {
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element) return element;
  }
  return null;
}

function ensureMerchandisePhotoInput() {
  let input = findFileInputByIds([
    "merchandiseImage",
    "mercadoriaImage",
    "merchPhoto",
    "mercadoriaPhoto",
    "fotoMercadoria"
  ]);

  if (input) return input;

  const nfInput = findNfImageInput();
  if (!nfInput) return null;

  const wrapper = document.createElement("div");
  wrapper.className = "photo-section";
  wrapper.style.marginTop = "14px";

  wrapper.innerHTML = `
    <div class="form-section-title">📦 Foto da mercadoria</div>
    <label for="merchandiseImage">
      Selecione ou tire uma foto da mercadoria
    </label>
    <input
      id="merchandiseImage"
      class="field-input"
      type="file"
      accept="image/*"
      capture="environment"
    >
    <div id="merchandisePhotoStatus" class="form-status"></div>
  `;

  const parent = nfInput.parentElement || nfInput;
  parent.insertAdjacentElement("afterend", wrapper);

  return document.getElementById("merchandiseImage");
}

function fileToBase64(file, maxWidth = 2000, quality = 0.84) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = event => {
      const image = new Image();

      image.onload = () => {
        let width = image.width;
        let height = image.height;

        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);

        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error("Não foi possível preparar a foto."));
            return;
          }

          const blobReader = new FileReader();

          blobReader.onload = () => {
            const result = blobReader.result;

            resolve({
              base64: result.split(",")[1],
              mimeType: "image/jpeg"
            });
          };

          blobReader.onerror = () => {
            reject(new Error("Erro ao preparar a foto."));
          };

          blobReader.readAsDataURL(blob);
        }, "image/jpeg", quality);
      };

      image.onerror = () => {
        reject(new Error("Não foi possível abrir a foto."));
      };

      image.src = event.target.result;
    };

    reader.onerror = () => {
      reject(new Error("Não foi possível ler a foto."));
    };

    reader.readAsDataURL(file);
  });
}

function getSelectedPhotoInput(ids) {
  const input = findFileInputByIds(ids);

  if (!input || !input.files || !input.files.length) {
    return null;
  }

  return input.files[0];
}


/* =========================================================
   SALVAR RECEBIMENTO
   ========================================================= */

async function saveReceipt() {

  const status =
    document.getElementById(
      "saveStatus"
    );

  const button =
    document.getElementById(
      "saveReceiptBtn"
    );

  status.className =
    "form-status";

  status.textContent =
    "";

  const nfe =
    document
      .getElementById(
        "receiptNfe"
      )
      .value
      .trim();

  const supplier =
    document
      .getElementById(
        "receiptSupplier"
      )
      .value
      .trim();

  const dateValue =
    document
      .getElementById(
        "receiptDate"
      )
      .value;

  const receivedBy =
    document
      .getElementById(
        "receivedBy"
      )
      .value
      .trim();

  const observation =
    document
      .getElementById(
        "observation"
      )
      .value
      .trim();

  if (!nfe) {

    status.className =
      "form-status error";

    status.textContent =
      "Informe o número da NF-e.";

    return;
  }

  const items =
    [
      ...document.querySelectorAll(
        "#itemsContainer .item-card"
      )
    ].map(card => ({

      description:
        card
          .querySelector(
            ".item-description"
          )
          .value
          .trim(),

      quantity:
        Number(
          card
            .querySelector(
              ".item-quantity"
            )
            .value || 0
        ),

      destination:
        card
          .querySelector(
            ".item-destination"
          )
          .value,

      os:
        card
          .querySelector(
            ".item-os"
          )
          ?.value
          .trim() || "",

      task:
        card
          .querySelector(
            ".item-task"
          )
          ?.value
          .trim() || "",

      client:
        card
          .querySelector(
            ".item-client"
          )
          ?.value
          .trim() || ""
    }));

  const invalid =
    items.some(
      item =>
        !item.description ||
        item.quantity <= 0 ||
        !item.destination
    );

  if (invalid) {

    status.className =
      "form-status error";

    status.textContent =
      "Preencha descrição, quantidade e destino de todos os materiais.";

    return;
  }

  const date =
    dateValue
      ? dateValue
          .split("-")
          .reverse()
          .join("/")
      : "";

  const nfPhotoFile = getSelectedPhotoInput([
    "nfImage",
    "nfeImage",
    "nfPhoto",
    "nfePhoto",
    "nfImageInput",
    "nfeImageInput",
    "photoNf",
    "photoNfe"
  ]);

  const merchandisePhotoInput =
    ensureMerchandisePhotoInput();

  const merchandisePhotoFile =
    merchandisePhotoInput &&
    merchandisePhotoInput.files &&
    merchandisePhotoInput.files.length
      ? merchandisePhotoInput.files[0]
      : null;

  button.classList.add(
    "loading-btn"
  );

  button.textContent =
    "⏳ Salvando...";

  try {

    button.textContent =
      "⏳ Preparando fotos...";

    let nfPhoto = null;
    let merchandisePhoto = null;

    if (nfPhotoFile) {
      nfPhoto = await fileToBase64(
        nfPhotoFile,
        2000,
        0.84
      );
    }

    if (merchandisePhotoFile) {
      merchandisePhoto = await fileToBase64(
        merchandisePhotoFile,
        2000,
        0.84
      );
    }

    button.textContent =
      "⏳ Salvando...";

    await apiPost({

      action:
        "saveReceipt",

      receipt: {
        date,
        nfe,
        supplier,
        items,
        receivedBy,
        observation,
        nfPhoto,
        merchandisePhoto
      }
    });

    status.className =
      "form-status success";

    status.textContent =
      "Recebimento salvo com sucesso!";

    document
      .getElementById(
        "receiptNfe"
      )
      .value = "";

    document
      .getElementById(
        "receiptSupplier"
      )
      .value = "";

    document
      .getElementById(
        "receivedBy"
      )
      .value = "";

    document
      .getElementById(
        "observation"
      )
      .value = "";

    const nfPhotoInput =
      findNfImageInput();

    if (nfPhotoInput) {
      nfPhotoInput.value = "";
    }

    const merchandiseInput =
      ensureMerchandisePhotoInput();

    if (merchandiseInput) {
      merchandiseInput.value = "";
    }

    const nfPhotoStatus =
      document.getElementById(
        "nfReadStatus"
      );

    if (nfPhotoStatus) {
      nfPhotoStatus.textContent = "";
    }

    const merchandiseStatus =
      document.getElementById(
        "merchandisePhotoStatus"
      );

    if (merchandiseStatus) {
      merchandiseStatus.textContent = "";
    }

    document
      .getElementById(
        "itemsContainer"
      )
      .innerHTML = "";

    prepareNewReceipt();

    setTimeout(
      () => showScreen("home"),
      800
    );

  } catch (error) {

    status.className =
      "form-status error";

    status.textContent =
      "Não foi possível salvar: " +
      error.message;

  } finally {

    button.classList.remove(
      "loading-btn"
    );

    button.textContent =
      "✅ Finalizar recebimento";
  }
}


/* =========================================================
   RECEBIMENTOS
   ========================================================= */

async function loadLatest() {

  const list =
    document.getElementById(
      "latestList"
    );

  if (!list) return;

  list.innerHTML =
    '<div class="empty-state"><span>⏳</span><strong>Carregando recebimentos...</strong></div>';

  try {

    renderLatest(
      await apiGet("latest")
    );

  } catch (error) {

    list.innerHTML =
      '<div class="empty-state"><span>⚠️</span><strong>Não foi possível carregar os recebimentos</strong><small>' +
      escapeHtml(
        error.message
      ) +
      "</small></div>";
  }
}


async function loadToday() {

  const screen =
    document.getElementById(
      "day"
    );

  if (!screen) return;

  const card =
    screen.querySelector(
      ".section-card"
    );

  card.innerHTML =
    '<h2>Recebimentos do dia</h2><div class="empty-state compact"><span>⏳</span><strong>Carregando...</strong></div>';

  try {

    const receipts =
      await apiGet("today");

    if (!receipts.length) {

      card.innerHTML =
        '<h2>Recebimentos do dia</h2><div class="empty-state compact"><span>📋</span><strong>Nenhum recebimento hoje</strong></div>';

      return;
    }

    card.innerHTML =
      '<h2>Recebimentos do dia</h2><div class="receipt-list">' +
      receipts
        .map(receiptCard)
        .join("") +
      "</div>";

  } catch (error) {

    card.innerHTML =
      '<h2>Recebimentos do dia</h2><div class="empty-state compact"><span>⚠️</span><strong>Erro ao consultar</strong><small>' +
      escapeHtml(
        error.message
      ) +
      "</small></div>";
  }
}


function renderLatest(
  receipts = []
) {

  const list =
    document.getElementById(
      "latestList"
    );

  if (!receipts.length) {

    list.innerHTML =
      '<div class="empty-state"><span>📦</span><strong>Nenhum recebimento registrado ainda</strong><small>Os últimos recebimentos aparecerão aqui.</small></div>';

    return;
  }

  list.innerHTML =
    receipts
      .slice(0, 5)
      .map(receiptCard)
      .join("");
}


function receiptCard(
  receipt
) {

  const count =
    Array.isArray(
      receipt.items
    )
      ? receipt.items.length
      : 0;

  return `
    <button
      class="receipt-item"
      type="button"
    >
      <div class="receipt-main">

        <div>

          <div class="receipt-nfe">
            NF-e ${escapeHtml(
              receipt.nfe || ""
            )}
          </div>

          <div class="receipt-supplier">
            ${escapeHtml(
              receipt.supplier ||
              "Fornecedor não informado"
            )}
          </div>

          <div class="receipt-meta">
            ${count}
            ${
              count === 1
                ? "material"
                : "materiais"
            }
            ·
            ${escapeHtml(
              receipt.destination ||
              "Destino não informado"
            )}
          </div>

        </div>

        <div class="receipt-date">
          ${escapeHtml(
            receipt.date || ""
          )}
        </div>

      </div>
    </button>
  `;
}


/* =========================================================
   EVENTOS
   ========================================================= */

document.addEventListener(
  "click",
  event => {

    const target =
      event.target.closest(
        "[data-screen]"
      );

    if (target) {
      showScreen(
        target.dataset.screen
      );
    }
  }
);


document.addEventListener(
  "DOMContentLoaded",
  () => {

    const addBtn =
      document.getElementById(
        "addItemBtn"
      );

    if (addBtn) {
      addBtn.addEventListener(
        "click",
        () => addItem()
      );
    }

    const saveBtn =
      document.getElementById(
        "saveReceiptBtn"
      );

    if (saveBtn) {
      saveBtn.addEventListener(
        "click",
        saveReceipt
      );
    }


    /*
     * Botão Ler NF-e
     */

    const readNfBtn =
      findReadNfButton();

    if (readNfBtn) {

      readNfBtn.addEventListener(
        "click",
        event => {

          event.preventDefault();

          readNfImage();
        }
      );
    }


    /*
     * Seleção da foto.
     * Não inicia a leitura automaticamente.
     */

    const nfInput =
      findNfImageInput();

    if (nfInput) {

      nfInput.addEventListener(
        "change",
        () => {

          const status =
            document.getElementById(
              "nfReadStatus"
            );

          if (status) {
            status.textContent =
              "📷 Foto selecionada. Clique em \"Ler NF-e\".";
          }
        }
      );
    }

    const merchandiseInput =
      ensureMerchandisePhotoInput();

    if (merchandiseInput) {
      merchandiseInput.addEventListener(
        "change",
        () => {
          const status =
            document.getElementById(
              "merchandisePhotoStatus"
            );

          if (status) {
            status.textContent =
              merchandiseInput.files &&
              merchandiseInput.files.length
                ? "📷 Foto da mercadoria selecionada."
                : "";
          }
        }
      );
    }

    showScreen("home");
  }
);


/* =========================================================
   UTILITÁRIO
   ========================================================= */

function escapeHtml(value) {

  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}
