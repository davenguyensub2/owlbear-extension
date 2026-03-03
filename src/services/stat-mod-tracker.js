import OBR from "@owlbear-rodeo/sdk";
import { eventDispatcher } from "../api/OBREventDispatcher";

const processingTokens = new Set();

export const trackStatModifying = async () => {
  eventDispatcher.subscribe("scene.items.onchange", async (items) => {
    await handleStatMod(items);
  });
};

const handleStatMod = async (items) => {
  const activeMods = items.filter(
    (i) => i.name.startsWith("mod_") || i.name.startsWith("toggle_")
  );

  const allItems = await OBR.scene.items.getItems();

  for (const modToken of activeMods) {
    // const allItems = await OBR.scene.items.getItems();
    
    // Tìm Nhà (Dock)
    const dockName = `${modToken.name}_box`;
    const dockItem = allItems.find((i) => i.name === dockName);
    const homePos = dockItem ? dockItem.position : null;

    // --- CƠ CHẾ THÁO CỜ ---
    // Nếu Token đã quay về nhà (khớp tọa độ), xóa khỏi danh sách đang xử lý
    if (homePos && isAtHome(modToken.position, homePos)) {
      processingTokens.delete(modToken.id);
      continue; // Đã về nhà thì không check va chạm nữa
    }

    // Nếu Token đang bị gắn cờ (đang bay về nhà), bỏ qua mọi xử lý tiếp theo
    if (processingTokens.has(modToken.id)) continue;

    // --- KIỂM TRA VA CHẠM ---
    const target = allItems.find(
      (i) =>
        i.layer === "CHARACTER" &&
        isOverlapping(modToken.position, i.position) &&
        i.id !== modToken.id
    );

    if (target) {
      // --- GẮN CỜ ID ---
      processingTokens.add(modToken.id);

      const finalTitle = await calculateNewTitle(modToken, target);

      if (finalTitle === null) {
        processingTokens.delete(modToken.id); // Người dùng cancel thì tháo cờ luôn
        return;
      }

      // Cập nhật Atomic
      console.log("Update atomic", modToken.id, target.id);
      await OBR.scene.items.updateItems([modToken.id, target.id], (updates) => {
        for (let item of updates) {
          if (item.id === modToken.id) {
            if (homePos) item.position = homePos;
          } else if (item.id === target.id && item.text) {
            item.text.plainText = finalTitle;
          }
        }
      });
    }
  }
};

// Hàm bổ trợ kiểm tra đã về nhà chưa (cho phép sai số nhỏ 1-2 pixel do làm tròn)
function isAtHome(pos1, pos2) {
  return Math.abs(pos1.x - pos2.x) < 1 && Math.abs(pos1.y - pos2.y) < 1;
}

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