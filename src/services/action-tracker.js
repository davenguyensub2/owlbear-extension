import { eventDispatcher } from "./event-dispatcher";
import { constants } from "../constants/constants";
export class ActionTracker {
  constructor(onActionDetected) {
    this.lastStates = new Map();
    this.onActionDetected = onActionDetected; 
    eventDispatcher.subscribe("scene.items.onchange", (items) => this.detectChanges(items));
  }

  updateStates(items) {
    items
      .filter((i) => i.layer === "CHARACTER")
      .forEach((i) => {
        this.lastStates.set(i.id, {
          name: i.name,
          x: Math.round(i.position.x),
          y: Math.round(i.position.y),
          data: JSON.parse(
            JSON.stringify(i.metadata[constants.EXTENSION_METADATA_AI_GM] || {}),
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
          data: item.metadata[constants.EXTENSION_METADATA_AI_GM] || {},
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
}
