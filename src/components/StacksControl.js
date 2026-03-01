import OBR from "@owlbear-rodeo/sdk";
import { eventDispatcher } from "../api/OBREventDispatcher.js";
import { createElement } from "../helpers/render-helper.js";
import { constants } from "../constants/constants";

export class StacksControl {
  constructor() {
    this.editingStack = null;
    this.expandedStacks = new Set();
    this.selectedCards = [];

    this.container = createElement(
      "div",
      "flex flex-col h-full w-full p-2 text-white overflow-hidden",
    );

    // 2. Top Panel: Chứa Title và Form tạo Stack
    this.topPanel = createElement(
      "div",
      "flex-none pb-4 border-b border-gray-700",
    );

    const title = createElement(
      "div",
      "text-xl font-bold uppercase tracking-tighter mb-2",
      "Stacks Control",
    );
    const addStackArea = this.renderAddStackArea();
    const moveToolbar = this.renderMoveToolbar();

    this.topPanel.appendChild(title);
    this.topPanel.append(addStackArea, moveToolbar);

    // 3. Bottom Panel: Chứa danh sách các Stack
    this.bottomPanel = createElement(
      "div",
      "flex-1 overflow-y-auto mt-4 pr-1 custom-scrollbar",
    );
    this.stacksListContainer = createElement("div", "space-y-4 text-sm");

    this.bottomPanel.appendChild(this.stacksListContainer);

    // Ghép vào container chính
    this.container.appendChild(this.topPanel);
    this.container.appendChild(this.bottomPanel);

    // Đăng ký event
    eventDispatcher.subscribe("scene.onmetadatachange", (metadata) =>
      this.updateStacks(metadata),
    );
    this.init();
  }

  async init() {
    OBR.onReady(async () => {
      const isSceneReady = await OBR.scene.isReady();
      if (isSceneReady) {
        const metadata = await OBR.scene.getMetadata();
        this.updateStacks(metadata);
      } else {
        console.log("Scene chưa sẵn sàng, chờ người chơi mở map.");
      }
    });
  }
  async getCurrentStacks() {
    const metadata = await OBR.scene.getMetadata();
    const stacks = { ...(metadata[constants.EXTENSION_METADATA_STACKS] || {}) };
    return stacks;
  }

  async saveCurrentStacks(stacks) {
    await OBR.scene.setMetadata({
      [constants.EXTENSION_METADATA_STACKS]: stacks,
    });
  }

  renderAddStackArea() {
    const area = createElement("div", "flex gap-2");
    this.newStackInput = createElement(
      "input",
      "border p-1 text-sm flex-1",
      "",
    );
    this.newStackInput.placeholder = "Tên stack mới...";

    const addBtn = createElement(
      "div",
      "border p-1 cursor-pointer text-sm",
      "Tạo",
    );
    addBtn.onclick = () => this.createNewStack();

    area.appendChild(this.newStackInput);
    area.appendChild(addBtn);
    return area;
  }

  renderMoveToolbar() {
    const row = createElement(
      "div",
      "flex flex-wrap items-center gap-1 mt-2 p-2 bg-gray-900 rounded border border-gray-700 text-[11px]",
    );

    // 1. Số lượng (0 = Selected)
    this.moveAmountInput = createElement(
      "input",
      "bg-black border border-gray-600 rounded px-1",
      "0",
    );
    this.moveAmountInput.type = "number";

    // 2. Dropdown Stack Nguồn
    this.sourceStackSelect = createElement(
      "select",
      "bg-gray-800 border border-gray-600 rounded max-w-[70px]",
    );

    // 3. Vị trí LẤY (Source Pos)
    this.srcPosSelect = createElement(
      "select",
      "bg-gray-800 border border-gray-600 rounded",
    );
    ["Top", "Bot", "Random", "Index"].forEach((p) => {
      const opt = createElement("option", "", p);
      opt.value = p.toLowerCase();
      this.srcPosSelect.appendChild(opt);
    });

    // Input Index cho nguồn (hiện khi chọn Index)
    this.srcIndexInput = createElement(
      "input",
      "w-8 bg-black border border-gray-600 rounded px-1 hidden",
      "1",
    );
    this.srcPosSelect.onchange = () =>
      this.srcIndexInput.classList.toggle(
        "hidden",
        this.srcPosSelect.value !== "index",
      );

    const toText = createElement("span", "text-gray-500", "to");

    // 4. Vị trí BỎ VÀO (Target Pos)
    this.tgtPosSelect = createElement(
      "select",
      "bg-gray-800 border border-gray-600 rounded",
    );
    ["Top", "Bot", "Random", "Index"].forEach((p) => {
      const opt = createElement("option", "", p);
      opt.value = p.toLowerCase();
      this.tgtPosSelect.appendChild(opt);
    });

    // Input Index cho đích
    this.tgtIndexInput = createElement(
      "input",
      "w-8 bg-black border border-gray-600 rounded px-1 hidden",
      "1",
    );
    this.tgtPosSelect.onchange = () =>
      this.tgtIndexInput.classList.toggle(
        "hidden",
        this.tgtPosSelect.value !== "index",
      );

    // 5. Dropdown Stack Đích
    this.targetStackSelect = createElement(
      "select",
      "bg-gray-800 border border-gray-600 rounded max-w-[70px]",
    );

    // 6. Nút Move
    const moveBtn = createElement(
      "button",
      "bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded font-bold ml-auto",
      "MOVE",
    );
    moveBtn.onclick = () => this.executeComplexMove();

    row.append(
      this.moveAmountInput,
      this.sourceStackSelect,
      this.srcPosSelect,
      this.srcIndexInput,
      toText,
      this.tgtPosSelect,
      this.tgtIndexInput,
      this.targetStackSelect,
      moveBtn,
    );
    return row;
  }
  updateDropdowns(allStacks) {
    const stackNames = Object.keys(allStacks);

    // Lưu giá trị đang chọn hiện tại để tránh bị reset về mặc định khi re-render
    const currentSrc = this.sourceStackSelect.value;
    const currentTarget = this.targetStackSelect.value;

    // Xóa trắng
    this.sourceStackSelect.replaceChildren();
    this.targetStackSelect.replaceChildren();

    stackNames.forEach((name) => {
      const optSrc = createElement("option", "", name);
      optSrc.value = name;
      const optTarget = optSrc.cloneNode(true);

      this.sourceStackSelect.appendChild(optSrc);
      this.targetStackSelect.appendChild(optTarget);
    });

    // Khôi phục lại giá trị đã chọn nếu stack đó vẫn tồn tại
    if (stackNames.includes(currentSrc))
      this.sourceStackSelect.value = currentSrc;
    if (stackNames.includes(currentTarget))
      this.targetStackSelect.value = currentTarget;
  }

  toggleSelectCard(stackName, cardIndex) {
    const existingIdx = this.selectedCards.findIndex(
      (c) => c.stack === stackName && c.index === cardIndex,
    );

    if (existingIdx > -1) {
      this.selectedCards.splice(existingIdx, 1);
    } else {
      this.selectedCards.push({ stack: stackName, index: cardIndex });
    }

    // Render lại để cập nhật số thứ tự 1, 2, 3...
    this.init();
  }
  async executeComplexMove() {
    const amount = parseInt(this.moveAmountInput.value);
    const srcName = this.sourceStackSelect.value;
    const tgtName = this.targetStackSelect.value;

    const srcPos = this.srcPosSelect.value;
    const tgtPos = this.tgtPosSelect.value;

    const stacks = await this.getCurrentStacks();
    if (!stacks[srcName] || !stacks[tgtName]) return;

    let cardsToMove = [];

    // --- BƯỚC 1: LẤY BÀI RA (SOURCE) ---
    if ((amount === 0 || !amount)&& this.selectedCards.length > 0) {
      // Lấy theo danh sách đã chọn (Select)
      // Sắp xếp index từ lớn đến bé để splice không làm lệch mảng
      const selectedFromSrc = this.selectedCards
        .filter((c) => c.stack === srcName)
        .sort((a, b) => b.index - a.index);

      selectedFromSrc.forEach((c) => {
        const [card] = stacks[srcName].splice(c.index, 1);
        cardsToMove.push(card);
      });
      cardsToMove.reverse(); // Đưa về đúng thứ tự đã chọn 1, 2, 3...
    } else if (amount > 0) {
      // Lấy theo vị trí Top/Bot/Random/Index
      const num = Math.min(amount, stacks[srcName].length);
      for (let i = 0; i < num; i++) {
        let idx = 0;
        if (srcPos === "top") idx = 0;
        else if (srcPos === "bot") idx = stacks[srcName].length - 1;
        else if (srcPos === "random")
          idx = Math.floor(Math.random() * stacks[srcName].length);
        else if (srcPos === "index")
          idx = parseInt(this.srcIndexInput.value) - 1;

        // Đảm bảo index hợp lệ
        idx = Math.max(0, Math.min(idx, stacks[srcName].length - 1));
        const [card] = stacks[srcName].splice(idx, 1);
        cardsToMove.push(card);
      }
    }

    if (cardsToMove.length === 0) return alert("Không có bài để di chuyển!");

    // --- BƯỚC 2: BỎ BÀI VÀO (TARGET) ---
    if (tgtPos === "top") {
      stacks[tgtName].unshift(...cardsToMove);
    } else if (tgtPos === "bot") {
      stacks[tgtName].push(...cardsToMove);
    } else if (tgtPos === "random") {
      cardsToMove.forEach((card) => {
        const rIdx = Math.floor(Math.random() * (stacks[tgtName].length + 1));
        stacks[tgtName].splice(rIdx, 0, card);
      });
    } else if (tgtPos === "index") {
      let insIdx = parseInt(this.tgtIndexInput.value) - 1;
      insIdx = Math.max(0, Math.min(insIdx, stacks[tgtName].length));
      stacks[tgtName].splice(insIdx, 0, ...cardsToMove);
    }

    // Reset trạng thái và lưu
    this.selectedCards = [];
    await this.saveCurrentStacks(stacks);
  }

  async createNewStack() {
    const name = this.newStackInput.value.trim();
    if (!name) return;
    const stacks = await this.getCurrentStacks();
    if (stacks[name]) return alert("Đã có stack này!");

    stacks[name] = [];
    await this.saveCurrentStacks(stacks);
    this.newStackInput.value = "";
  }

  async updateStacks(metadata) {
    // FIX LỖI: Kiểm tra đúng tên biến stacksListContainer
    if (this.stacksListContainer.contains(document.activeElement)) return;

    this.stacksListContainer.replaceChildren();
    const allStacks = metadata
      ? metadata[constants.EXTENSION_METADATA_STACKS] || {}
      : await this.getCurrentStacks();

    this.updateDropdowns(allStacks);
    for (const [stackName, items] of Object.entries(allStacks)) {
      const isExpanded = this.expandedStacks.has(stackName);

      const stackWrapper = createElement(
        "div",
        "border border-gray-600 rounded p-2 bg-gray-800 mb-2",
      );

      // --- Header ---
      const header = createElement(
        "div",
        "flex flex-col mb-2 border-b border-gray-700 pb-1",
      );
      const stackNameDiv = createElement(
        "div",
        "font-bold text-yellow-500",
        [stackName, " (", items.length, ")"].join(""),
      );
      const btnGroup = createElement("div", "flex gap-1");

      // Nút Show
      const showBtn = createElement(
        "div",
        "border p-1 cursor-pointer text-sm",
        isExpanded ? "Hide" : "Show",
      );
      showBtn.onclick = () => this.showStack(stackName);

      // Nút Shuffle
      const shufBtn = createElement(
        "div",
        "border p-1 cursor-pointer text-sm",
        "Shuffle",
      );
      shufBtn.onclick = () => this.shuffleStack(stackName);

      const sortBtn = createElement(
        "div",
        "border p-1 cursor-pointer text-sm hover:bg-gray-600",
        "Sort",
      );
      sortBtn.onclick = () => this.sortStack(stackName);

      // Nút Edit
      const editBtn = createElement(
        "div",
        "border p-1 cursor-pointer text-sm",
        this.editingStack === stackName ? "Save" : "Edit",
      );
      editBtn.onclick = () =>
        this.editingStack === stackName
          ? this.saveStack(stackName)
          : ((this.editingStack = stackName), this.updateStacks(metadata));

      // Nút Delete
      const delBtn = createElement(
        "div",
        "border p-1 cursor-pointer text-sm",
        "Delete",
      );
      delBtn.onclick = () => this.deleteStack(stackName);

      btnGroup.append(showBtn, shufBtn, sortBtn, editBtn, delBtn);
      header.append(stackNameDiv, btnGroup);
      stackWrapper.appendChild(header);

      // --- Content ---
      if (this.editingStack === stackName) {
        const tx = createElement(
          "textarea",
          "w-full bg-black text-xs p-2 rounded h-32 font-mono text-green-400 border border-blue-500",
        );
        tx.value = items.join("\n");
        tx.id = `edit-${stackName}`;
        stackWrapper.appendChild(tx);
      } else if (isExpanded) {
        const list = createElement(
          "div",
          "flex flex-col gap-1 max-h-48 overflow-y-auto",
        );
        items.forEach((item, index) => {
          list.appendChild(
            this.createCardLine(stackName, item, index, allStacks),
          );
        });
        stackWrapper.appendChild(list);
      }

      this.stacksListContainer.appendChild(stackWrapper);
    }
  }

  async sortStack(name) {
    const stacks = await this.getCurrentStacks();
    if (!stacks[name]) return;

    // Sắp xếp theo bảng chữ cái
    // localeCompare giúp sắp xếp tiếng Việt hoặc các ký tự số chuẩn hơn
    stacks[name].sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

    await this.saveCurrentStacks(stacks);
  }
  async showStack(name) {
    if (this.expandedStacks.has(name)) {
      this.expandedStacks.delete(name);
    } else {
      this.expandedStacks.add(name);
    }
    await this.updateStacks();
  }

  async shuffleStack(name) {
    const stacks = await this.getCurrentStacks();
    stacks[name].sort(() => Math.random() - 0.5);
    await this.saveCurrentStacks(stacks);
  }

  async deleteStack(name) {
    if (!confirm(`Xóa vĩnh viễn stack [${name}]?`)) return;
    const stacks = await this.getCurrentStacks();
    delete stacks[name];
    await this.saveCurrentStacks(stacks);
  }

  async saveStack(stackName) {
    const tx = document.getElementById(`edit-${stackName}`);
    const newItems = tx.value
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l !== "");
    const stacks = await this.getCurrentStacks();
    stacks[stackName] = newItems;
    this.editingStack = null;
    await this.saveCurrentStacks(stacks);
  }

  createCardLine(stackName, content, index) {
    const isSelected = this.selectedCards.findIndex(
      (c) => c.stack === stackName && c.index === index,
    );
    const row = createElement(
      "div",
      `flex items-center gap-2 p-1 rounded cursor-pointer ${isSelected > -1 ? "bg-blue-900" : "bg-gray-700"}`,
    );

    // Hiển thị số thứ tự nếu được chọn
    const badge = createElement(
      "div",
      "w-4 h-4 flex items-center justify-center text-[9px] rounded-full border border-gray-400",
    );
    badge.innerText = isSelected > -1 ? isSelected + 1 : "";

    const label = createElement(
      "span",
      "flex-1 truncate",
      content.split("|")[0],
    );

    row.onclick = () => this.toggleSelectCard(stackName, index);
    row.append(badge, label);
    return row;
  }

  showMoveMenu(from, idx, allStacks) {
    const target = prompt("Đến Stack:", Object.keys(allStacks)[0]);
    if (!target || !allStacks[target]) return;
    const pos = prompt("Vị trí (t: đầu, b: cuối, r: ngẫu nhiên):", "t");

    const map = { t: "top", b: "bottom", r: "random" };
    this.moveItem(from, idx, target, map[pos] || "top");
  }

  async moveItem(from, idx, to, pos) {
    const stacks = await this.getCurrentStacks();
    const [item] = stacks[from].splice(idx, 1);

    if (pos === "top") stacks[to].unshift(item);
    else if (pos === "bottom") stacks[to].push(item);
    else {
      const rIdx = Math.floor(Math.random() * (stacks[to].length + 1));
      stacks[to].splice(rIdx, 0, item);
    }
    await this.saveCurrentStacks(stacks);
  }

  getElement() {
    return this.container;
  }
}
