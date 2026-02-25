import OBR from "@owlbear-rodeo/sdk";
import { eventDispatcher } from "../api/OBREventDispatcher.js";
import { createElement } from "../helpers/render-helper.js";

export class MetadataEditor {
  constructor() {
    this.container = createElement("div", "flex flex-col gap-4 w-full");
    const title = createElement(
      "div",
      "text-xl font-bold uppercase tracking-tighter",
      "Metadata Editor",
    );
    this.playerList = createElement("div", "space-y-6");
    this.container.appendChild(title);
    this.container.appendChild(this.playerList);
    eventDispatcher.subscribe("scene.items.onchange", (items) =>
      this.updatePlayerUI(items),
    );
  }

  updatePlayerUI(items) {
    const characters = items
      .filter((item) => item.layer === "CHARACTER")
      .sort((a, b) => {
        const nameA = (a.name || "Unknown").toLowerCase();
        const nameB = (b.name || "Unknown").toLowerCase();
        return nameA.localeCompare(nameB);
      });

    // Nếu đang gõ vào textarea thì không vẽ lại để tránh mất con trỏ
    if (this.playerList.contains(document.activeElement)) return;

    this.playerList.replaceChildren();

    characters.forEach((character) => {
      const section = document.createElement("div");
      section.className = "flex flex-col gap-2";

      // Tên character + ID (ID để DM dễ track nếu cần)
      const label = createElement("div", "flex justify-between items-end");
      const name = createElement("span", "text-sm font-bold", character.name);
      const id = createElement("span", "text-[9px] font-mono", character.id);
      label.appendChild(name);
      label.appendChild(id);
      section.appendChild(label);

      // Ô Textarea chứa JSON
      const textarea = createElement(
        "textarea",
        [
          "w-full h-40 bg-black/40 border border-white/10 rounded-lg p-3 text-xs font-mono",
          "focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all",
          "resize-none scrollbar-thin",
        ].join(" "),
      );
      textarea.spellcheck = false;

      const internalData = character.metadata["com.dataforai/data"] || {};
      textarea.value = JSON.stringify(internalData, null, 2);

      // Lưu khi người dùng gõ xong (onchange) hoặc nhấn ra ngoài
      textarea.onchange = async (e) => {
        try {
          const parsedData = JSON.parse(e.target.value);

          await OBR.scene.items.updateItems([character.id], (items) => {
            for (let item of items) {
              item.metadata["com.dataforai/data"] = parsedData;
            }
          });

          // Hiệu ứng báo thành công
          textarea.classList.add("border-green-500");
          setTimeout(() => textarea.classList.remove("border-green-500"), 1000);
        } catch (err) {
          // Nếu JSON sai định dạng, báo lỗi đỏ
          console.error("JSON không hợp lệ:", err);
          textarea.classList.add("border-red-500");
          alert("Lỗi cú pháp JSON! Vui lòng kiểm tra lại dấu phẩy hoặc ngoặc.");
        }
      };

      section.append(label, textarea);
      this.playerList.appendChild(section);
    });
  }

  getElement() {
    return this.container;
  }
}
