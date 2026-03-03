import OBR from "@owlbear-rodeo/sdk";
import { eventDispatcher } from "../api/OBREventDispatcher";

let isProcessing = false;

export const trackStatModifying = async () => {
  eventDispatcher.subscribe("scene.items.onchange", async (items) => {
    if (isProcessing) return;
    await handleStatMod(items);
  });
};

const handleStatMod = async (items) => {
  if (isProcessing) return;

  const activeMods = items.filter(
    (i) => i.name.startsWith("mod_") || i.name.startsWith("toggle_"),
  );

  for (const modToken of activeMods) {
    const allItems = await OBR.scene.items.getItems();

    const target = allItems.find(
      (i) =>
        i.layer === "CHARACTER" &&
        isOverlapping(modToken.position, i.position) &&
        i.id !== modToken.id,
    );

    if (target) {
      isProcessing = true;

      const dockName = `${modToken.name}_box`;
      const dockItem = allItems.find((i) => i.name === dockName);
      const homePos = dockItem ? dockItem.position : modToken.position;

      // --- BƯỚC QUAN TRỌNG: Tính toán Title mới TRƯỚC khi update ---
      const finalTitle = await calculateNewTitle(modToken, target);

      // Nếu nhấn Cancel ở prompt hoặc lỗi, mở khóa và dừng
      if (finalTitle === null) {
        isProcessing = false;
        return;
      }

      // --- BƯỚC 2: Cập nhật CẢ 2 cùng lúc trong 1 lần gọi duy nhất ---
      await OBR.scene.items.updateItems([modToken.id, target.id], (updates) => {
        for (let item of updates) {
          if (item.id === modToken.id) {
            item.position = homePos; // Đưa token về box
          } else if (item.id === target.id) {
            if (item.text) {
              item.text.plainText = finalTitle; // Đổi title character
            }
          }
        }
      });

      // Đợi sync hoàn tất rồi mới cho phép nhận event mới
      setTimeout(() => {
        isProcessing = false;
      }, 300); 
    }
  }
};

// Tách riêng logic tính toán chuỗi để code sạch
async function calculateNewTitle(modToken, target) {
  const modType = modToken.name.split("_")[1];
  const isToggle = modToken.name.startsWith("toggle_");
  let currentTitle = target.text?.plainText || "";

  let [statsStr, effectsStr] = currentTitle.split("_|");
  statsStr = statsStr || "";
  effectsStr = effectsStr || "";

  if (isToggle) {
    let effects = effectsStr.split("_").filter((e) => e);
    effects = effects.includes(modType)
      ? effects.filter((e) => e !== modType)
      : [...effects, modType];
    effectsStr = effects.join("_");
  } else {
    const change = parseInt(prompt(`Thay đổi chỉ số ${modType}:`, "1"));
    if (isNaN(change)) return null;

    let statMap = {};
    statsStr.split("_").filter((s) => s).forEach((p) => {
      const match = p.match(/^([a-zA-Z]+)(\d+)$/);
      if (match) statMap[match[1]] = parseInt(match[2]);
    });

    const newVal = (statMap[modType] || 0) + change;
    newVal <= 0 ? delete statMap[modType] : (statMap[modType] = newVal);

    const priorityOrder = ["H", "M", "A", "R", "S", "Re"];
    const allKeys = Object.keys(statMap).sort((a, b) => {
      const ia = priorityOrder.indexOf(a), ib = priorityOrder.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return ia !== -1 ? -1 : ib !== -1 ? 1 : a.localeCompare(b);
    });

    statsStr = allKeys.map((k) => k + statMap[k]).join("_");
  }

  return effectsStr ? `${statsStr}_|${effectsStr}` : statsStr;
}

function isOverlapping(pos1, pos2) {
  const threshold = 60;
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
}