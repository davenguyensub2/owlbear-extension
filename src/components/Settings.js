import { createElement } from "../helpers/render-helper.js";

export class Settings {
  constructor() {
    this.container = createElement("div", "flex flex-col gap-4 w-full");
    this.render();
  }


  render() {
    const title = createElement("div", "text-xl font-bold uppercase tracking-tighter", "Settings");
    this.container.appendChild(title);
    const fields = [
      { id: 'gemini_api_key', label: 'Gemini API Key', type: 'password', placeholder: 'AIza...' },
      { id: 'gemini_model', label: 'Model', type: 'text', placeholder: 'gemini-1.5-flash' }
    ];

    fields.forEach(field => {
      const group = createElement("div", "flex flex-col gap-1 mb-2");
      const label = createElement("label", "text-[10px] font-bold uppercase", field.label);
      const input = createElement("input", 
        "bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500/50");
      input.type = field.type;
      input.value = localStorage.getItem(field.id) || (field.id === 'gemini_model' ? 'gemini-1.5-flash' : '');
      input.placeholder = field.placeholder;
      input.onchange = (e) => {
        localStorage.setItem(field.id, e.target.value);
        input.classList.add("border-green-500/50");
        setTimeout(() => input.classList.remove("border-green-500/50"), 1000);
      };

      input.onkeydown = (e) => e.stopPropagation();

      group.append(label, input);
      this.container.appendChild(group);
    });
  }

  getElement() { return this.container; }
}