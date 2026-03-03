import OBR from "@owlbear-rodeo/sdk";
import { eventDispatcher } from "../api/OBREventDispatcher";

// Biến cờ (Flag) để ngăn chặn xử lý trùng lặp trong cùng một thời điểm
let isProcessing = false;

export const trackStatModifying = async () => {
  eventDispatcher.subscribe("scene.items.onchange", async (items) => {
    if (isProcessing) return; // Nếu đang xử lý thì bỏ qua các event change tiếp theo
    await handleStatMod(items);
  });
};

const handleStatMod = async (items) => {
  if (isProcessing) return;

  // Lấy các Token Mod đang được tác động
  const activeMods = items.filter(
    (i) => i.name.startsWith("mod_") || i.name.startsWith("toggle_"),
  );

  for (const modToken of activeMods) {
    const allItems = await OBR.scene.items.getItems();

    // 1. Tìm Character mục tiêu (Va chạm)
    const target = allItems.find(
      (i) =>
        i.layer === "CHARACTER" &&
        isOverlapping(modToken.position, i.position) &&
        i.id !== modToken.id,
    );

    if (target) {
      isProcessing = true;

      // 2. TÌM "NHÀ" (DOCK) CỦA TOKEN NÀY
      // Nếu token tên mod_H, nó sẽ tìm item tên mod_H_box
      const dockName = `${modToken.name}_box`;
      const dockItem = allItems.find((i) => i.name === dockName);

      // Tọa độ hồi gia: Nếu tìm thấy box thì về tâm box, không thì về vị trí hiện tại (đứng yên)
      const homePos = dockItem ? dockItem.position : modToken.position;

      // 3. ĐƯA TOKEN VỀ "NHÀ" TRƯỚC
      await OBR.scene.items.updateItems([modToken.id], (updates) => {
        for (let item of updates) {
          item.position = homePos;
        }
      });

      // 4. THỰC HIỆN BIẾN ĐỔI CHỈ SỐ
      await applyModifier(modToken, target);

      setTimeout(() => {
        isProcessing = false;
      }, 100);
    }
  }
};

async function applyModifier(modToken, target) {
  const modType = modToken.name.split("_")[1];
  const isToggle = modToken.name.startsWith("toggle_");

  // Lấy text hiện tại
  let currentTitle = target.text.plainText || "";

  // Tách phần Stats và Effects bằng dấu _|
  let parts = currentTitle.split("_|");
  let statsStr = parts[0] || "";
  let effectsStr = parts[1] || "";

  if (isToggle) {
    // Logic Toggle hiệu ứng
    let effects = effectsStr.split("_").filter((e) => e !== "");
    if (effects.includes(modType)) {
      effects = effects.filter((e) => e !== modType);
    } else {
      effects.push(modType);
    }
    effectsStr = effects.join("_");
  } else {
    // Logic Tăng giảm chỉ số
    const change = parseInt(prompt(`Thay đổi chỉ số ${modType}:`, "1"));
    if (isNaN(change)) return;

    // Phân tách statsStr thành object (H4_M5 -> {H: 4, M: 5})
    let statMap = {};
    const statPairs = statsStr.split("_").filter((s) => s !== "");
    statPairs.forEach((p) => {
      const match = p.match(/^([a-zA-Z]+)(\d+)$/);
      if (match) statMap[match[1]] = parseInt(match[2]);
    });

    const newVal = (statMap[modType] || 0) + change;
    if (newVal <= 0) {
      delete statMap[modType];
    } else {
      statMap[modType] = newVal;
    }

    // Sắp xếp lại theo thứ tự chuẩn của bạn
    const priorityOrder = ["H", "M", "A", "R", "S", "Re"];

    // 2. Lấy tất cả các Key đang có trong statMap (bao gồm cả những cái nằm ngoài priorityOrder)
    const allKeys = Object.keys(statMap);

    // 3. Phân loại và sắp xếp
    const sortedStats = allKeys.sort((a, b) => {
      const indexA = priorityOrder.indexOf(a);
      const indexB = priorityOrder.indexOf(b);

      // Nếu cả hai đều nằm trong danh sách ưu tiên -> Sắp xếp theo thứ tự trong danh sách
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;

      // Nếu chỉ có A nằm trong danh sách -> Đẩy A lên trước
      if (indexA !== -1) return -1;

      // Nếu chỉ có B nằm trong danh sách -> Đẩy B lên trước
      if (indexB !== -1) return 1;

      // Nếu cả hai đều là chỉ số lạ -> Sắp xếp theo bảng chữ cái (alphabet)
      return a.localeCompare(b);
    });

    // 4. Chuyển thành chuỗi H4_M5_L2...
    statsStr = sortedStats.map((k) => k + statMap[k]).join("_");
  }

  const finalTitle = `${statsStr}_|${effectsStr}`;

  // Cập nhật lại Character
  await OBR.scene.items.updateItems([target.id], (updates) => {
    for (let item of updates) {
      item.text.plainText = finalTitle;
    }
  });
}

function isOverlapping(pos1, pos2) {
  const threshold = 60; // Khoảng cách pixel để coi là "chạm"
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
}
