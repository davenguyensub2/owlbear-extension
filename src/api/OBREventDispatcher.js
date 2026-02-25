import OBR from "@owlbear-rodeo/sdk";

class OBREventDispatcher {
  constructor() {
    // Lưu trữ subscribers theo từng loại event
    this.events = {
      "scene.items.onchange": [],
      "scene.onmetadatachange": [],
      "player.onchange": [],
    };
    this.timers = {}; // Lưu trữ timer debounce cho từng loại event riêng biệt
    this.isInitialized = false;
  }

  // Đăng ký: dispatcher.subscribe("items:change", callback)
  subscribe(eventName, callback) {
    if (!this.events[eventName]) {
      console.error(`❌ EventDispatcher: Event name "${eventName}" sai rồi, check lại list trong constructor.`);
      return;
    }
    
    if (typeof callback !== 'function') {
      console.error(`❌ EventDispatcher: Bạn đang truyền một thứ là ${typeof callback} vào event "${eventName}". Phải là một function!`);
      return;
    }

    if (this.events[eventName]) {
      this.events[eventName].push(callback);
    } else {
      console.warn(`Event ${eventName} không tồn tại.`);
    }
  }

  init() {
    if (this.isInitialized) return;

    OBR.onReady(async () => {
      // 1. Theo dõi Items (Có Debounce)
      OBR.scene.items.onChange((items) => {
        this.#debounce(
          "scene.items.onchange",
          () => this.#broadcast("scene.items.onchange", items),
          0,
        );
      });

      // 2. Theo dõi Scene Metadata (Thường dùng cho cài đặt chung của phòng)
      OBR.scene.onMetadataChange((metadata) => {
        this.#broadcast("scene.onmetadatachange", metadata);
      });

      // 3. Theo dõi Players (Ví dụ: AI cần biết ai vừa online/offline)
      OBR.player.onChange((players) => {
        this.#broadcast("player.onchange", players);
      });

      this.isInitialized = true;
    });
  }

  // Hàm helper để gửi tin tới đúng nhóm
  #broadcast(eventName, data) {
    this.events[eventName].forEach((callback) => callback(data));
  }

  // Hàm helper để debounce từng loại event riêng lẻ
  #debounce(key, func, delay) {
    clearTimeout(this.timers[key]);
    this.timers[key] = setTimeout(func, delay);
  }
}

export const eventDispatcher = new OBREventDispatcher();
