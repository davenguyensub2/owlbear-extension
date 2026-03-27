import OBR from "@owlbear-rodeo/sdk";

class OBREventDispatcher {
  constructor() {
    this.events = {
      "scene.items.onchange": [],
      "scene.onmetadatachange": [],
      "scene.local.onchange": [],
      "player.onchange": [],
    };
    this.isInitialized = false;
  }

  subscribe(eventName, callback) {
    if (this.events[eventName]) {
      this.events[eventName].push(callback);
    }
  }

  // Khởi chạy các listener của OBR
  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Chỉ đăng ký listener một lần duy nhất
    OBR.scene.items.onChange((items) => {
      this.#broadcast("scene.items.onchange", items);
    });

    OBR.scene.onMetadataChange((metadata) => {
      this.#broadcast("scene.onmetadatachange", metadata);
    });

    OBR.scene.local.onChange((items) => {
      this.#broadcast("scene.local.onchange", items);
    });

    OBR.player.onChange((players) => {
      this.#broadcast("player.onchange", players);
    });
  }

  #broadcast(eventName, data) {
    this.events[eventName].forEach((callback) => callback(data));
  }
}

export const eventDispatcher = new OBREventDispatcher();