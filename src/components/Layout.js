// src/components/Layout.js

export class AppLayout {
  constructor() {
    // Khung chính
    this.container = document.createElement("div");
    this.container.className = "flex w-full h-screen bg-[#242424] text-gray-200 overflow-hidden";

    // Thanh điều hướng trái (Sidebar)
    this.nav = document.createElement("nav");
    this.nav.className =
      "w-16 border-r border-white/10 flex flex-col items-center py-6 gap-4 bg-[#1a1a1a]";

    // Vùng nội dung phải
    this.content = document.createElement("main");
    this.content.className = "flex-1 overflow-y-auto p-2 relative";

    this.container.append(this.nav, this.content);
  }

  addTab(iconContent, onClick) {
    const btn = document.createElement("button");
    btn.className =
      "nav-btn group flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 hover:bg-amber-500/10 active:scale-90 relative cursor-pointer";

    const iconWrapper = document.createElement("div");
    iconWrapper.className =
      "w-6 h-6 flex items-center justify-center text-xl text-gray-400 group-[.active]:text-amber-500 group-hover:text-amber-400 transition-colors pointer-events-none font-sans";

    // KIỂM TRA: Nếu iconContent là chuỗi SVG
    if (
      typeof iconContent === "string" &&
      iconContent.trim().startsWith("<svg")
    ) {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(iconContent, "image/svg+xml");
      const svgElement = svgDoc.documentElement;
      svgElement.setAttribute("class", "w-full h-full fill-current");
      iconWrapper.appendChild(svgElement);
    } else {
      // Nếu là Emoji hoặc Text (ví dụ: '📜', '⚙️', 'AI')
      iconWrapper.textContent = iconContent;
    }

    btn.appendChild(iconWrapper);

    btn.addEventListener("click", () => {
      this.#clearActive();
      btn.classList.add(
        "active",
        "bg-amber-500/20",
        "ring-1",
        "ring-amber-500/30",
      );
      iconWrapper.classList.add("text-amber-500");
      onClick();
    });

    this.nav.appendChild(btn);
  }

  // Xóa trạng thái active của các nút khác
  #clearActive() {
    const allBtns = this.nav.querySelectorAll(".nav-btn");
    allBtns.forEach((btn) => {
      btn.classList.remove(
        "active",
        "bg-amber-500/20",
        "ring-1",
        "ring-amber-500/30",
      );
      const wrapper = btn.querySelector("div");
      if (wrapper) wrapper.classList.remove("text-amber-500");
    });
  }

  /**
   * Thay đổi nội dung hiển thị bên phải
   * @param {HTMLElement} element
   */
  setContent(element) {
    if (element instanceof HTMLElement) {
      this.content.replaceChildren(element);
    }
  }

  /**
   * Render toàn bộ Layout vào ID app
   */
  render() {
    const app = document.getElementById("app");
    if (app) {
      app.replaceChildren(this.container);
    }
  }
}
