const API_URL = "https://script.google.com/macros/s/AKfycbw3B8ZLc22bcc1HIAVvoaDguRzlupuixrp5Mka5667VHQF9oIvmEeRpqvuqEJMzRXMK/exec";
const screens = ["home", "new", "day", "history"];

let selectedNfPhotoFile = null;
let selectedMerchandisePhotoFile = null;

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
  if (id === "history") loadHistory();
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

  setupNfPhotoControls();
  ensureMerchandisePhotoInput();
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

  const file =
    selectedNfPhotoFile ||
    (input.files && input.files.length
      ? input.files[0]
      : null);

  if (!file) {
    alert(
      "Primeiro tire ou selecione uma foto da NF-e."
    );
    return;
  }

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

function createPhotoButton(label, className = "photo-action-btn") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  return button;
}

function buildPhotoControls({
  input,
  kind,
  selectedSetter,
  getSelected,
  statusId
}) {
  if (!input) return;

  input.accept = "image/*";
  input.setAttribute("capture", "environment");
  input.style.display = "none";

  const existing =
    document.getElementById(
      kind === "nf" ? "nfPhotoControls" : "merchandisePhotoControls"
    );

  if (existing) return;

  const galleryInput = document.createElement("input");
  galleryInput.type = "file";
  galleryInput.accept = "image/*";
  galleryInput.style.display = "none";
  galleryInput.id =
    kind === "nf"
      ? "nfGalleryInput"
      : "merchandiseGalleryInput";

  const controls = document.createElement("div");
  controls.id =
    kind === "nf"
      ? "nfPhotoControls"
      : "merchandisePhotoControls";
  controls.className = "photo-controls";
  controls.style.display = "flex";
  controls.style.gap = "8px";
  controls.style.flexWrap = "wrap";
  controls.style.marginTop = "8px";

  const cameraButton =
    createPhotoButton("📷 Tirar foto");

  const galleryButton =
    createPhotoButton("🖼️ Escolher da galeria");

  cameraButton.addEventListener("click", () => {
    input.click();
  });

  galleryButton.addEventListener("click", () => {
    galleryInput.click();
  });

  input.addEventListener("change", () => {
    const file =
      input.files && input.files.length
        ? input.files[0]
        : null;

    selectedSetter(file);

    const status =
      document.getElementById(statusId);

    if (status) {
      status.textContent =
        file
          ? "📷 Foto tirada com sucesso."
          : "";
    }
  });

  galleryInput.addEventListener("change", () => {
    const file =
      galleryInput.files &&
      galleryInput.files.length
        ? galleryInput.files[0]
        : null;

    selectedSetter(file);

    const status =
      document.getElementById(statusId);

    if (status) {
      status.textContent =
        file
          ? "🖼️ Foto selecionada da galeria."
          : "";
    }
  });

  input.parentElement?.appendChild(galleryInput);
  input.parentElement?.appendChild(controls);

  controls.appendChild(cameraButton);
  controls.appendChild(galleryButton);

  return {
    cameraInput: input,
    galleryInput,
    controls
  };
}

function setupNfPhotoControls() {
  const input = findNfImageInput();

  if (!input) return;

  buildPhotoControls({
    input,
    kind: "nf",
    selectedSetter: file => {
      selectedNfPhotoFile = file;
    },
    getSelected: () => selectedNfPhotoFile,
    statusId: "nfReadStatus"
  });
}

function ensureMerchandisePhotoInput() {

  const saveButton =
    document.getElementById("saveReceiptBtn");

  if (!saveButton) return null;

  /*
   * Localiza o campo de foto da mercadoria que já existe
   * no index.html. Não cria outro campo se ele existir.
   */
  let input = findFileInputByIds([
    "goodsPhoto",
    "merchandiseImage",
    "mercadoriaImage",
    "merchPhoto",
    "mercadoriaPhoto",
    "fotoMercadoria"
  ]);

  /*
   * Fallback: procura um input de imagem próximo ao texto
   * "Foto da mercadoria".
   */
  if (!input) {
    const allFileInputs = [
      ...document.querySelectorAll('input[type="file"]')
    ];

    input = allFileInputs.find(candidate => {
      const parent = candidate.closest(
        ".photo-section, .form-section, .card, section, div"
      );

      return parent &&
        /foto\s+da\s+mercadoria/i.test(
          parent.textContent || ""
        );
    }) || null;
  }

  if (!input) {
    /*
     * Se o HTML realmente não tiver o campo, cria um único
     * input oculto dentro do formulário.
     */
    input = document.createElement("input");
    input.id = "merchandiseImage";
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.style.display = "none";

    saveButton.parentElement.insertBefore(
      input,
      saveButton
    );
  }

  input.id = input.id || "merchandiseImage";
  input.accept = "image/*";
  input.setAttribute("capture", "environment");
  input.style.display = "none";

  /*
   * IMPORTANTE:
   * remove controles antigos da mercadoria.
   * Eles eram inseridos no final do cartão e por isso
   * apareciam depois do botão Finalizar.
   */
  document
    .querySelectorAll(
      "#merchandisePhotoControls"
    )
    .forEach(el => el.remove());

  document
    .querySelectorAll(
      "#merchandiseGalleryInput"
    )
    .forEach(el => el.remove());

  /*
   * Remove possíveis controles antigos sem ID que pertençam
   * à seção de mercadoria.
   */
  document
    .querySelectorAll(
      ".photo-controls"
    )
    .forEach(el => {
      if (
        /foto\s+da\s+mercadoria/i.test(
          el.parentElement?.textContent || ""
        )
      ) {
        el.remove();
      }
    });

  /*
   * Cria UMA entrada de galeria.
   */
  const galleryInput =
    document.createElement("input");

  galleryInput.type = "file";
  galleryInput.accept = "image/*";
  galleryInput.id =
    "merchandiseGalleryInput";
  galleryInput.style.display = "none";

  /*
   * Cria UMA área de botões.
   */
  const controls =
    document.createElement("div");

  controls.id =
    "merchandisePhotoControls";

  controls.className =
    "photo-controls";

  controls.style.display = "flex";
  controls.style.gap = "8px";
  controls.style.flexWrap = "wrap";
  controls.style.marginTop = "8px";
  controls.style.marginBottom = "8px";

  const cameraButton =
    createPhotoButton("📷 Tirar foto");

  const galleryButton =
    createPhotoButton(
      "🖼️ Escolher da galeria"
    );

  /*
   * Câmera.
   */
  cameraButton.addEventListener(
    "click",
    () => {
      input.click();
    }
  );

  /*
   * Galeria.
   */
  galleryButton.addEventListener(
    "click",
    () => {
      galleryInput.click();
    }
  );

  /*
   * Foto tirada pela câmera.
   */
  input.addEventListener(
    "change",
    () => {

      const file =
        input.files &&
        input.files.length
          ? input.files[0]
          : null;

      selectedMerchandisePhotoFile =
        file;

      const status =
        document.getElementById(
          "merchandisePhotoStatus"
        );

      if (status) {
        status.textContent =
          file
            ? "📷 Foto da mercadoria selecionada."
            : "";
      }
    }
  );

  /*
   * Foto escolhida da galeria.
   */
  galleryInput.addEventListener(
    "change",
    () => {

      const file =
        galleryInput.files &&
        galleryInput.files.length
          ? galleryInput.files[0]
          : null;

      selectedMerchandisePhotoFile =
        file;

      const status =
        document.getElementById(
          "merchandisePhotoStatus"
        );

      if (status) {
        status.textContent =
          file
            ? "🖼️ Foto da mercadoria selecionada."
            : "";
      }
    }
  );

  controls.appendChild(
    cameraButton
  );

  controls.appendChild(
    galleryButton
  );

  /*
   * Coloca os controles EXATAMENTE antes do botão Finalizar.
   * Não usa input.parentElement.appendChild(),
   * que era a causa do segundo conjunto aparecer depois
   * do botão.
   */
  saveButton.parentElement.insertBefore(
    galleryInput,
    saveButton
  );

  saveButton.parentElement.insertBefore(
    controls,
    saveButton
  );

  /*
   * Garante um status único.
   */
  let status =
    document.getElementById(
      "merchandisePhotoStatus"
    );

  if (!status) {
    status =
      document.createElement("div");

    status.id =
      "merchandisePhotoStatus";

    status.className =
      "form-status";

    saveButton.parentElement.insertBefore(
      status,
      saveButton
    );
  }

  return input;
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

  const nfPhotoFile =
    selectedNfPhotoFile ||
    (() => {
      const input = findNfImageInput();
      return input &&
        input.files &&
        input.files.length
        ? input.files[0]
        : null;
    })();

  ensureMerchandisePhotoInput();

  const merchandisePhotoFile =
    selectedMerchandisePhotoFile;

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

    const nfGalleryInput =
      document.getElementById("nfGalleryInput");

    if (nfGalleryInput) {
      nfGalleryInput.value = "";
    }

    const merchandiseInput =
      ensureMerchandisePhotoInput();

    if (merchandiseInput) {
      merchandiseInput.value = "";
    }

    const merchandiseGalleryInput =
      document.getElementById(
        "merchandiseGalleryInput"
      );

    if (merchandiseGalleryInput) {
      merchandiseGalleryInput.value = "";
    }

    selectedNfPhotoFile = null;
    selectedMerchandisePhotoFile = null;

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
      data-receipt-id="${escapeHtml(receipt.id || "")}"
      aria-label="Abrir NF-e ${escapeHtml(receipt.nfe || "")}"
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

      <div class="receipt-open-hint">
        Toque para ver detalhes →
      </div>
    </button>
  `;
}

/* =========================================================
   HISTÓRICO
   ========================================================= */

async function loadHistory(query = "") {

  let list =
    document.getElementById(
      "historyList"
    );

  if (!list) {
    const screen =
      document.getElementById(
        "history"
      );

    if (screen) {
      const card =
        screen.querySelector(
          ".section-card, .card"
        );

      if (card) {
        list =
          document.createElement(
            "div"
          );
        list.id =
          "historyList";
        list.style.marginTop =
          "14px";
        card.appendChild(
          list
        );
      }
    }
  }

  if (!list) return;

  list.innerHTML =
    '<div class="empty-state"><span>⏳</span><strong>Carregando histórico...</strong></div>';

  try {

    const receipts =
      await apiGet(
        "history",
        {
          q: query
        }
      );

    renderHistory(receipts);

  } catch (error) {

    list.innerHTML =
      '<div class="empty-state"><span>⚠️</span><strong>Não foi possível carregar o histórico</strong><small>' +
      escapeHtml(
        error.message
      ) +
      "</small></div>";
  }
}


function renderHistory(
  receipts = []
) {

  const list =
    document.getElementById(
      "historyList"
    );

  if (!list) return;

  if (!receipts.length) {

    list.innerHTML =
      '<div class="empty-state"><span>🔎</span><strong>Nenhum recebimento encontrado</strong><small>Pesquise por NF-e, fornecedor ou material.</small></div>';

    return;
  }

  list.innerHTML =
    '<div class="receipt-list">' +
    receipts
      .map(receiptCard)
      .join("") +
    "</div>";
}


function searchHistory() {

  const input =
    document.getElementById(
      "historySearch"
    ) ||
    document.getElementById(
      "search"
    ) ||
    document.querySelector(
      'input[name="history-search"]'
    );

  const query =
    input
      ? input.value.trim()
      : "";

  loadHistory(query);
}


/* =========================================================
   DETALHES DO RECEBIMENTO
   ========================================================= */

function showReceiptDetails(
  receiptId
) {

  if (!receiptId) return;

  /*
   * Primeiro procuramos os dados já carregados
   * na tela atual.
   */
  const cards =
    document.querySelectorAll(
      "[data-receipt-id]"
    );

  /*
   * O objeto completo pode não estar mais disponível
   * no DOM. Nesse caso consultamos o histórico e
   * localizamos pelo ID.
   */
  const queryPromise =
    apiGet(
      "history",
      {}
    );

  queryPromise
    .then(receipts => {

      const receipt =
        receipts.find(
          item =>
            String(item.id) ===
            String(receiptId)
        );

      if (!receipt) {

        showReceiptDetailMessage(
          "Recebimento não encontrado."
        );

        return;
      }

      renderReceiptDetails(
        receipt
      );

    })
    .catch(error => {

      showReceiptDetailMessage(
        error.message ||
        "Não foi possível carregar os detalhes."
      );

    });
}


function renderReceiptDetails(
  receipt
) {

  let modal =
    document.getElementById(
      "receiptDetailModal"
    );

  if (!modal) {

    modal =
      document.createElement(
        "div"
      );

    modal.id =
      "receiptDetailModal";

    document.body.appendChild(
      modal
    );
  }

  const items =
    Array.isArray(
      receipt.items
    )
      ? receipt.items
      : [];

  modal.className =
    "receipt-detail-overlay";

  modal.innerHTML = `
    <div
      class="receipt-detail-card"
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes do recebimento"
    >

      <div class="receipt-detail-header">
        <div>
          <div class="receipt-detail-title">
            NF-e ${escapeHtml(
              receipt.nfe || ""
            )}
          </div>

          <div class="receipt-detail-subtitle">
            ${escapeHtml(
              receipt.supplier ||
              "Fornecedor não informado"
            )}
          </div>
        </div>

        <button
          type="button"
          class="receipt-detail-close"
          id="closeReceiptDetail"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>

      <div class="receipt-detail-grid">

        <div>
          <span>Data</span>
          <strong>
            ${escapeHtml(
              receipt.date || "-"
            )}
          </strong>
        </div>

        <div>
          <span>Recebido por</span>
          <strong>
            ${escapeHtml(
              receipt.receivedBy ||
              "-"
            )}
          </strong>
        </div>

      </div>

      <div class="receipt-detail-section">

        <h3>📦 Materiais recebidos</h3>

        <div class="receipt-detail-items">
          ${
            items.length
              ? items
                  .map(
                    (item, index) => `
                      <div class="receipt-detail-item">

                        <div class="receipt-detail-item-main">
                          <strong>
                            ${index + 1}.
                            ${escapeHtml(
                              item.description ||
                              "Material não informado"
                            )}
                          </strong>

                          <span>
                            Quantidade:
                            ${escapeHtml(
                              item.quantity ||
                              0
                            )}
                          </span>
                        </div>

                        <div class="receipt-detail-item-meta">
                          <span>
                            Destino:
                            ${escapeHtml(
                              item.destination ||
                              "-"
                            )}
                          </span>

                          ${
                            item.os
                              ? `<span>OS: ${escapeHtml(item.os)}</span>`
                              : ""
                          }

                          ${
                            item.task
                              ? `<span>Tarefa: ${escapeHtml(item.task)}</span>`
                              : ""
                          }

                          ${
                            item.client
                              ? `<span>Cliente: ${escapeHtml(item.client)}</span>`
                              : ""
                          }
                        </div>

                      </div>
                    `
                  )
                  .join("")
              : '<div class="empty-state compact"><span>📦</span><strong>Nenhum material informado</strong></div>'
          }
        </div>

      </div>

      ${
        receipt.observation
          ? `
            <div class="receipt-detail-section">
              <h3>📝 Observação</h3>
              <p class="receipt-detail-observation">
                ${escapeHtml(
                  receipt.observation
                )}
              </p>
            </div>
          `
          : ""
      }

      <div class="receipt-detail-footer">
        <button
          type="button"
          class="primary-btn"
          id="closeReceiptDetailBottom"
        >
          Fechar
        </button>
      </div>

    </div>
  `;

  const close =
    () => {
      modal.className =
        "receipt-detail-overlay hidden";
    };

  document
    .getElementById(
      "closeReceiptDetail"
    )
    ?.addEventListener(
      "click",
      close
    );

  document
    .getElementById(
      "closeReceiptDetailBottom"
    )
    ?.addEventListener(
      "click",
      close
    );

  modal.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        modal
      ) {
        close();
      }
    },
    {
      once: true
    }
  );
}


function showReceiptDetailMessage(
  message
) {

  let modal =
    document.getElementById(
      "receiptDetailModal"
    );

  if (!modal) {

    modal =
      document.createElement(
        "div"
      );

    modal.id =
      "receiptDetailModal";

    document.body.appendChild(
      modal
    );
  }

  modal.className =
    "receipt-detail-overlay";

  modal.innerHTML = `
    <div class="receipt-detail-card">

      <div class="receipt-detail-header">
        <strong>Recebimento</strong>

        <button
          type="button"
          class="receipt-detail-close"
          onclick="document.getElementById('receiptDetailModal').classList.add('hidden')"
        >
          ×
        </button>
      </div>

      <div class="empty-state">
        <span>⚠️</span>
        <strong>${escapeHtml(message)}</strong>
      </div>

    </div>
  `;
}


/* =========================================================
   ESTILOS DOS DETALHES
   ========================================================= */

function ensureReceiptDetailStyles() {

  if (
    document.getElementById(
      "receiptDetailStyles"
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "receiptDetailStyles";

  style.textContent = `
    .receipt-open-hint {
      margin-top: 6px;
      font-size: 12px;
      opacity: .65;
      text-align: right;
    }

    .receipt-detail-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(0,0,0,.45);
      box-sizing: border-box;
    }

    .receipt-detail-overlay.hidden {
      display: none;
    }

    .receipt-detail-card {
      width: min(560px, 100%);
      max-height: 90vh;
      overflow-y: auto;
      background: #fff;
      border-radius: 18px;
      box-shadow: 0 18px 50px rgba(0,0,0,.25);
      padding: 18px;
      box-sizing: border-box;
    }

    .receipt-detail-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .receipt-detail-title {
      font-size: 20px;
      font-weight: 800;
    }

    .receipt-detail-subtitle {
      margin-top: 4px;
      font-size: 14px;
      opacity: .75;
    }

    .receipt-detail-close {
      border: 0;
      background: transparent;
      font-size: 30px;
      line-height: 1;
      cursor: pointer;
      padding: 0 4px;
    }

    .receipt-detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }

    .receipt-detail-grid > div {
      background: #f5f7fa;
      border-radius: 12px;
      padding: 10px;
    }

    .receipt-detail-grid span {
      display: block;
      font-size: 12px;
      opacity: .65;
      margin-bottom: 4px;
    }

    .receipt-detail-section {
      margin-top: 16px;
    }

    .receipt-detail-section h3 {
      margin: 0 0 10px;
      font-size: 15px;
    }

    .receipt-detail-item {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 8px;
    }

    .receipt-detail-item-main {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
    }

    .receipt-detail-item-main span,
    .receipt-detail-item-meta {
      font-size: 12px;
      opacity: .75;
    }

    .receipt-detail-item-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    .receipt-detail-observation {
      background: #f5f7fa;
      border-radius: 12px;
      padding: 12px;
      margin: 0;
      white-space: pre-wrap;
    }

    .receipt-detail-footer {
      margin-top: 18px;
    }

    @media (max-width: 480px) {
      .receipt-detail-grid {
        grid-template-columns: 1fr;
      }

      .receipt-detail-item-main {
        flex-direction: column;
      }
    }
  `;

  document.head.appendChild(
    style
  );
}



/* =========================================================
   EVENTOS
   ========================================================= */

document.addEventListener(
  "click",
  event => {

    const receiptTarget =
      event.target.closest(
        "[data-receipt-id]"
      );

    if (receiptTarget) {
      event.preventDefault();
      showReceiptDetails(
        receiptTarget.dataset.receiptId
      );
      return;
    }

    const historyButton =
      event.target.closest(
        "#historySearchBtn, #searchHistoryBtn, [data-history-search]"
      );

    if (historyButton) {
      event.preventDefault();
      searchHistory();
      return;
    }

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
  "keydown",
  event => {

    if (
      event.key !== "Enter"
    ) {
      return;
    }

    const target =
      event.target;

    if (
      target.matches(
        "#historySearch, #search, input[name='history-search']"
      )
    ) {
      event.preventDefault();
      searchHistory();
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
     * Fotos:
     * cria os botões "Tirar foto" e
     * "Escolher da galeria" para NF-e
     * e mercadoria.
     */
    setupNfPhotoControls();
    ensureMerchandisePhotoInput();
    ensureReceiptDetailStyles();


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