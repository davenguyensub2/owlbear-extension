import { createElement } from "../helpers/render-helper.js";
import OBR from "@owlbear-rodeo/sdk";

export class RandomTool {
  constructor() {
    // Lưu danh sách các bộ đếm vào localStorage để không bị mất khi F5
    const saved = localStorage.getItem('random_counters');
    this.counters = saved ? JSON.parse(saved) : [this.createNewCounterData("Player 1")];
    
    this.container = createElement("div", "flex flex-col gap-4 w-full p-2 animate-fade-in");
    this.render();
  }

  createNewCounterData(name = "New Tracker") {
    return {
      id: Date.now() + Math.random(),
      name: name,
      defaultValue: 20,
      currentMax: 20,
      isSimulation: false,
      lastResult: 0
    };
  }

  save() {
    localStorage.setItem('random_counters', JSON.stringify(this.counters));
  }

  async executeRoll(id) {
    const c = this.counters.find(item => item.id === id);
    if (!c || c.currentMax < 1) return;

    const result = Math.floor(Math.random() * c.currentMax) + 1;
    c.lastResult = result;

    if (c.isSimulation && c.currentMax > 1) {
      c.currentMax--;
    }

    this.save();
    this.render(); // Vẽ lại để cập nhật số

    try {
      if (OBR.isReady) {
        const playerName = await OBR.player.getName();
        await OBR.chat.sendMessage(`🎲 **${playerName}** [${c.name}] rút: **${result}** (1-${c.currentMax + (c.isSimulation ? 1 : 0)})`);
      }
    } catch (e) {}
  }

  render() {
    this.container.replaceChildren();

    // Thanh tiêu đề và nút Thêm khung mới
    const header = createElement("div", "flex justify-between items-center mb-2");
    header.innerHTML = `<div class="text-xl font-black uppercase tracking-tighter">Tools</div>`;
    
    const addBtn = createElement("button", "bg-blue-600 hover:bg-blue-500 text-[10px] font-bold px-3 py-1 rounded uppercase", "+ Add Tracker");
    addBtn.onclick = () => {
      this.counters.push(this.createNewCounterData(`Player ${this.counters.length + 1}`));
      this.save();
      this.render();
    };
    header.appendChild(addBtn);
    this.container.appendChild(header);

    // Danh sách các khung Random
    const list = createElement("div", "flex flex-col gap-4");
    
    this.counters.forEach(c => {
      const card = createElement("div", "relative flex flex-col gap-3 p-4 bg-white/5 rounded-xl border border-white/10 overflow-hidden");
      
      // Nút xóa khung (X)
      const delBtn = createElement("button", "absolute top-2 right-2 text-gray-600 hover:text-red-500 text-xs", "✕");
      delBtn.onclick = () => {
        this.counters = this.counters.filter(item => item.id !== c.id);
        this.save();
        this.render();
      };

      // Tên bộ đếm (có thể sửa)
      const nameInput = createElement("input", "bg-transparent border-none text-[10px] font-bold uppercase text-blue-400 outline-none w-2/3");
      nameInput.value = c.name;
      nameInput.onchange = (e) => { c.name = e.target.value; this.save(); };

      // Hiển thị Kết quả to và Max hiện tại
      const mainSection = createElement("div", "flex items-center justify-between gap-4");
      
      const resultView = createElement("div", "flex flex-col items-center flex-1");
      const resultVal = createElement("div", "text-4xl font-black", c.lastResult || "-");
      const resultLabel = createElement("div", "text-[8px] text-gray-500 uppercase", "Last Result");
      resultView.append(resultVal, resultLabel);

      const maxView = createElement("div", "flex flex-col items-center flex-1 border-l border-white/10");
      const maxVal = createElement("div", "text-2xl font-bold text-gray-400", c.currentMax);
      const maxLabel = createElement("div", "text-[8px] text-gray-500 uppercase", "Current Max");
      maxView.append(maxVal, maxLabel);

      mainSection.append(resultView, maxView);

      // Điều khiển: ROLL & SETTINGS
      const actionRow = createElement("div", "flex gap-2 items-center");
      
      const rollBtn = createElement("button", "flex-[2] bg-indigo-600 py-2 rounded font-bold text-sm shadow-lg active:scale-95", "ROLL");
      rollBtn.onclick = () => this.executeRoll(c.id);

      const resetBtn = createElement("button", "flex-1 bg-white/10 py-2 rounded text-[10px] font-bold hover:bg-white/20", "RESET");
      resetBtn.onclick = () => { c.currentMax = c.defaultValue; c.lastResult = 0; this.save(); this.render(); };

      actionRow.append(rollBtn, resetBtn);

      // Cài đặt nhỏ bên dưới
      const settingsRow = createElement("div", "flex items-center justify-between pt-2 border-t border-white/5");
      
      const defBox = createElement("div", "flex items-center gap-1");
      const defLab = createElement("span", "text-[8px] text-gray-500 uppercase", "Init:");
      const defInp = createElement("input", "bg-black/40 border border-white/10 rounded w-10 text-[10px] text-center");
      defInp.type = "number";
      defInp.value = c.defaultValue;
      defInp.onchange = (e) => { c.defaultValue = parseInt(e.target.value) || 1; this.save(); };
      defBox.append(defLab, defInp);

      const simLab = createElement("label", "flex items-center gap-1 cursor-pointer");
      const simInp = createElement("input", "w-3 h-3");
      simInp.type = "checkbox";
      simInp.checked = c.isSimulation;
      simInp.onchange = (e) => { c.isSimulation = e.target.checked; this.save(); };
      simLab.append(simInp, createElement("span", "text-[8px] text-gray-500 uppercase", "Sim"));

      settingsRow.append(defBox, simLab);

      card.append(delBtn, nameInput, mainSection, actionRow, settingsRow);
      list.appendChild(card);
    });

    this.container.appendChild(list);
  }

  getElement() { return this.container; }
}