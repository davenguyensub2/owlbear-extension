import { createElement } from "../helpers/render-helper.js";
import OBR from "@owlbear-rodeo/sdk";

export class RandomTool {
  constructor() {
    const saved = localStorage.getItem('random_counters');
    this.counters = saved ? JSON.parse(saved) : [this.createNewCounterData("Player 1", "#3b82f6")];
    
    this.container = createElement("div", "flex flex-col gap-4 w-full p-2 animate-fade-in");
    this.render();
  }

  createNewCounterData(name = "New Tracker", color = "#3b82f6") {
    return {
      id: Date.now() + Math.random(),
      name: name,
      color: color, // Màu mặc định (Blue)
      defaultValue: 20,
      currentMax: 20,
      isSimulation: false,
      lastResult: 0
    };
  }

  save() {
    localStorage.setItem('random_counters', JSON.stringify(this.counters));
  }

  render() {
    this.container.replaceChildren();

    const header = createElement("div", "flex justify-between items-center mb-2");
    header.innerHTML = `<div class="text-xl font-black uppercase tracking-tighter">Tools</div>`;
    
    const addBtn = createElement("button", "bg-white/10 hover:bg-white/20 text-[10px] font-bold px-3 py-1 rounded border border-white/10 uppercase", "+ Add Tracker");
    addBtn.onclick = () => {
      this.counters.push(this.createNewCounterData(`Player ${this.counters.length + 1}`));
      this.save();
      this.render();
    };
    header.appendChild(addBtn);
    this.container.appendChild(header);

    const list = createElement("div", "flex flex-col gap-4");
    
    this.counters.forEach(c => {
      // Container chính với Border màu chủ đạo
      const card = createElement("div", "relative flex flex-col gap-3 p-4 bg-black/40 rounded-xl border-l-4 shadow-xl transition-all");
      card.style.borderLeftColor = c.color;

      // --- DÒNG TIÊU ĐỀ: ĐỔI TÊN & CHỌN MÀU ---
      const topRow = createElement("div", "flex items-center gap-2");
      
      // Color Picker mini
      const colorInput = createElement("input", "w-4 h-4 bg-transparent border-none cursor-pointer");
      colorInput.type = "color";
      colorInput.value = c.color;
      colorInput.onchange = (e) => { c.color = e.target.value; this.save(); this.render(); };

      // Input Tên
      const nameInput = createElement("input", "bg-transparent border-none text-[11px] font-black uppercase outline-none flex-1");
      nameInput.style.color = c.color;
      nameInput.value = c.name;
      nameInput.onchange = (e) => { c.name = e.target.value; this.save(); };
      nameInput.onkeydown = (e) => e.stopPropagation();

      const delBtn = createElement("button", "text-gray-600 hover:text-red-500 text-xs px-1", "✕");
      delBtn.onclick = () => {
        this.counters = this.counters.filter(item => item.id !== c.id);
        this.save();
        this.render();
      };

      topRow.append(colorInput, nameInput, delBtn);

      // --- HIỂN THỊ KẾT QUẢ ---
      const mainSection = createElement("div", "flex items-center justify-around py-2");
      
      const resultView = createElement("div", "text-center");
      const resultVal = createElement("div", "text-5xl font-black tracking-tighter", c.lastResult || "-");
      resultVal.style.color = c.color;
      resultView.append(resultVal, createElement("div", "text-[8px] text-gray-500 uppercase", "Result"));

      const maxView = createElement("div", "text-center opacity-60");
      const maxVal = createElement("div", "text-2xl font-bold", c.currentMax);
      maxView.append(maxVal, createElement("div", "text-[8px] text-gray-500 uppercase", "Current Max"));

      mainSection.append(resultView, maxView);

      // --- NÚT BẤM (ROLL dùng màu chủ đạo) ---
      const actionRow = createElement("div", "flex gap-2");
      
      const rollBtn = createElement("button", "flex-[2] py-2 rounded-lg font-black text-xs shadow-lg active:scale-95 transition-transform text-white", "ROLL");
      rollBtn.style.backgroundColor = c.color;
      rollBtn.onclick = async () => {
          if (c.currentMax < 1) return;
          const res = Math.floor(Math.random() * c.currentMax) + 1;
          c.lastResult = res;
          if (c.isSimulation && c.currentMax > 1) c.currentMax--;
          this.save();
          this.render();
          try {
              const pName = await OBR.player.getName();
              await OBR.chat.sendMessage(`[${c.name}] **${pName}** rolled: **${res}**`);
          } catch(e) {}
      };

      const resetBtn = createElement("button", "flex-1 bg-white/5 hover:bg-white/10 py-2 rounded-lg text-[10px] font-bold text-gray-400 border border-white/5", "RESET");
      resetBtn.onclick = () => { c.currentMax = c.defaultValue; c.lastResult = 0; this.save(); this.render(); };

      actionRow.append(rollBtn, resetBtn);

      // --- CÀI ĐẶT NHỎ ---
      const settingsRow = createElement("div", "flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase");
      
      const setGroup = createElement("div", "flex items-center gap-3");
      
      // Default Value Input
      const defLabel = createElement("label", "flex items-center gap-1");
      const defInp = createElement("input", "bg-black/20 border border-white/10 rounded w-8 text-center text-white");
      defInp.type = "number";
      defInp.value = c.defaultValue;
      defInp.onchange = (e) => { c.defaultValue = parseInt(e.target.value) || 1; this.save(); };
      defLabel.append(createElement("span", "", "Deck:"), defInp);

      // Checkbox Simulation
      const simLabel = createElement("label", "flex items-center gap-1 cursor-pointer");
      const simInp = createElement("input", "w-3 h-3 accent-current");
      simInp.type = "checkbox";
      simInp.checked = c.isSimulation;
      simInp.onchange = (e) => { c.isSimulation = e.target.checked; this.save(); };
      simLabel.append(simInp, createElement("span", "", "Sim"));

      setGroup.append(defLabel, simLabel);
      settingsRow.append(setGroup);

      card.append(topRow, mainSection, actionRow, settingsRow);
      list.appendChild(card);
    });

    this.container.appendChild(list);
  }

  getElement() { return this.container; }
}