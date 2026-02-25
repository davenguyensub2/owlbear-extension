import OBR from "@owlbear-rodeo/sdk";

export class AIConsole {
  constructor() {
    this.container = document.createElement("div");
    this.container.className = "flex flex-col h-full overflow-hidden p-2 gap-2";

    this.pendingActions = []; // Nơi chứa các hành động chờ duyệt
    this.lastStates = new Map(); // Lưu state cũ để so sánh (ID -> {x, y, hp})
    this.debounceTimer = null;

    this.render();
    this.initObservers();
  }

  render() {
    this.container.replaceChildren(); // Đảm bảo container trống

    // --- 1. ACTION QUEUE HEADER ---
    const header = this.#createEl(
      "div",
      "flex justify-between items-center border-b border-white/10 pb-1",
    );
    const title = this.#createEl(
      "span",
      "text-[10px] font-bold text-amber-500 uppercase tracking-tighter",
      "Action Queue",
    );
    const clearBtn = this.#createEl(
      "button",
      "text-[9px] hover:text-red-400 text-gray-500",
      "CLEAR ALL",
    );
    clearBtn.onclick = () => {
      this.pendingActions = [];
      this.renderQueue();
    };
    header.append(title, clearBtn);

    // --- 2. QUEUE CONTAINER ---
    this.queueContainer = this.#createEl(
      "div",
      "flex flex-col gap-1 max-h-40 overflow-y-auto scrollbar-none",
    );

    // --- 3. CHAT AREA ---
    const chatArea = this.#createEl(
      "div",
      "border-t border-white/10 pt-2 flex flex-col gap-2 flex-1",
    );
    const chatTitle = this.#createEl(
      "span",
      "text-[10px] font-bold text-gray-500 uppercase",
      "Chat & Context",
    );
    this.chatLog = this.#createEl(
      "div",
      "flex-1 overflow-y-auto text-[11px] space-y-2 bg-black/20 rounded p-2",
    );

    // --- 4. INPUT AREA ---
    const inputWrapper = this.#createEl(
      "div",
      "flex gap-1 p-1 bg-white/5 rounded border border-white/10 focus-within:border-amber-500/50",
    );
    this.inputField = this.#createEl(
      "input",
      "flex-1 bg-transparent outline-none text-xs p-1",
    );
    this.inputField.placeholder = "Mô tả hành động của bạn...";

    const sendBtn = this.#createEl(
      "button",
      "px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-white text-[10px] font-bold transition-colors",
      "GỬI DM",
    );
    sendBtn.onclick = () => this.handleFinalSend();

    inputWrapper.append(this.inputField, sendBtn);
    chatArea.append(chatTitle, this.chatLog, inputWrapper);

    // Gắn tất cả vào container chính
    this.container.append(header, this.queueContainer, chatArea);
  }

  // Hàm helper để tạo Element nhanh và sạch
  #createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  // --- HỆ THỐNG THEO DÕI THAY ĐỔI ---

  async initObservers() {
    OBR.onReady(async () => {
      const isReady = await OBR.scene.isReady();
    if (!isReady) {
      console.warn("Scene chưa sẵn sàng, trả về mảng rỗng.");
      return [];
    }
      const items = await OBR.scene.items.getItems();
      this.updateLastStates(items);
      OBR.scene.items.onChange();
      // Lắng nghe thay đổi với Debounce
      OBR.scene.items.onChange((items) => {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.detectChanges(items);
        }, 400); // 400ms là đủ để người chơi thả chuột
      });
    });
  }

  updateLastStates(items) {
    items
      .filter((i) => i.layer === "CHARACTER")
      .forEach((i) => {
        this.lastStates.set(i.id, {
          name: i.name,
          x: Math.round(i.position.x),
          y: Math.round(i.position.y),
          data: JSON.parse(
            JSON.stringify(i.metadata["com.dataforai/data"] || {}),
          ),
        });
      });
  }

  detectChanges(items) {
    items
      .filter((i) => i.layer === "CHARACTER")
      .forEach((item) => {
        const last = this.lastStates.get(item.id);
        if (!last) return;

        const current = {
          x: Math.round(item.position.x),
          y: Math.round(item.position.y),
          data: item.metadata["com.dataforai/data"] || {},
        };

        // 1. Kiểm tra di chuyển
        if (last.x !== current.x || last.y !== current.y) {
          const dist = Math.round(
            Math.sqrt(
              Math.pow(current.x - last.x, 2) + Math.pow(current.y - last.y, 2),
            ) / 15,
          ); // Giả định 15px = 1ft
          this.addToQueue("move", `${item.name} di chuyển ${dist}ft`);
        }

        // 2. Kiểm tra thay đổi Metadata (HP, v.v.)
        for (let key in current.data) {
          if (current.data[key] !== last.data[key]) {
            this.addToQueue(
              "stat",
              `${item.name} đổi ${key}: ${last.data[key]} -> ${current.data[key]}`,
            );
          }
        }
      });
    this.updateLastStates(items); // Cập nhật lại "mốc" để so sánh lần sau
  }

  // --- QUẢN LÝ HÀNG ĐỢI (QUEUE) ---

  addToQueue(type, text) {
    this.pendingActions.push({ id: Date.now() + Math.random(), type, text });
    this.renderQueue();
  }

  renderQueue() {
    this.queueContainer.replaceChildren(); // Xóa sạch nhanh hơn innerHTML = ""

    this.pendingActions.forEach((action) => {
      const item = this.#createEl(
        "div",
        "flex justify-between items-center bg-white/5 px-2 py-1 rounded border border-white/5 text-[10px]",
      );
      const textSpan = this.#createEl(
        "span",
        "text-gray-400 font-mono italic",
        action.text,
      );
      const delBtn = this.#createEl(
        "button",
        "text-gray-600 hover:text-red-500 ml-2 p-1",
        "✕",
      );

      delBtn.onclick = () => {
        this.pendingActions = this.pendingActions.filter(
          (a) => a.id !== action.id,
        );
        this.renderQueue();
      };

      item.append(textSpan, delBtn);
      this.queueContainer.appendChild(item);
    });
  }

  // --- GỬI ĐI ---

  async handleFinalSend() {
    const userInput = this.inputField.value.trim();
    if (this.pendingActions.length === 0 && !userInput) return;

    // 1. Chuẩn bị Context
    const items = await OBR.scene.items.getItems();
    const sceneContext = items
      .filter((i) => i.layer === "CHARACTER")
      .map((i) => ({ name: i.name, stats: i.metadata["com.dataforai/data"] }));

    const actionText = this.pendingActions.map((a) => a.text).join(", ");
    const fullMessage = `Hành động: ${actionText}. Lời dẫn: ${userInput}`;

    this.addChatMessage("user", fullMessage);

    // Gọi API (Giống code cũ nhưng gửi fullMessage và sceneContext)
    // ... logic fetch gemini ở đây ...

    // Sau khi gửi thành công:
    this.pendingActions = [];
    this.renderQueue();
    this.inputField.value = "";
  }

  addChatMessage(role, text) {
    // const div = document.createElement("div");
    // div.className = `p-2 rounded ${role === "ai" ? "bg-amber-500/10 border-l-2 border-amber-500" : "bg-white/5"}`;
    // div.innerHTML = `<span class="opacity-50">${role === "ai" ? "✦" : ">"}</span> ${text}`;
    const div = this.#createEl(
      "div",
      `p-2 rounded ${role === "ai" ? "bg-amber-500/10 border-l-2 border-amber-500" : "bg-white/5"}`,
    );
    const span = this.#createEl(
      "span",
      "opacity-50",
      role === "ai" ? "✦" : ">",
    );
    const textSpan = this.#createEl("span", "", text);
    div.append(span, textSpan);
    this.chatLog.appendChild(div);
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }

  getElement() {
    return this.container;
  }
}
