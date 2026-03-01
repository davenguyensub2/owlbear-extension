import OBR from "@owlbear-rodeo/sdk";
import { eventDispatcher } from "../api/OBREventDispatcher";
import { constants } from "../constants/constants";

const NOTE_NAME = "target-info-note";

export const trackTargetInfo = async () => {
  eventDispatcher.subscribe("player.onchange", async (player) => {
    const selection = player.selection;
    if (selection && selection.length > 0) {
      const targetId = selection[0];
      const items = await OBR.scene.items.getItems([targetId]);
      const targetItem = items[0];
      if (targetItem && targetItem.layer === "CHARACTER") {
        updateTargetNote(targetItem);
      }
    }
  });
};

async function updateTargetNote(targetItem) {
  const allItems = await OBR.scene.items.getItems();
  const infoNote = allItems.find(item => 
    item.name === NOTE_NAME
  );

  if (!infoNote) return;

  // 1. Lấy đúng phần dữ liệu trong namespace của bạn
  const customData = targetItem.metadata[constants.EXTENSION_METADATA_AI_GM] || {};
  
  // 2. Chuẩn bị tiêu đề và nội dung JSON
  const title = `${targetItem.name}`;
  const jsonContent = JSON.stringify(customData, null, 2);

  // 3. Tách các dòng để đưa vào richText
  // Chúng ta gộp tiêu đề và từng dòng của JSON thành một mảng các paragraphs
  const allLines = [title, ...jsonContent.split("\n")];

  const richTextData = allLines.map(line => ({
    type: "paragraph",
    children: [{ 
      text: line,
      // Có thể thêm font-family mono cho đúng chất JSON nếu muốn
    }]
  }));

  // 4. Thực hiện cập nhật
  await OBR.scene.items.updateItems([infoNote.id], (items) => {
    for (let item of items) {
      if (item.text) {
        item.text.richText = richTextData;
        // Đồng bộ plainText để xem trong metadata item nếu cần
        item.text.plainText = allLines.join("\n");
        
        // Mẹo: Chỉnh font size nhỏ lại một chút để hiện JSON được nhiều hơn
        item.text.style.fontSize = 16;
        item.text.style.fontFamily = "Courier New, monospace";
      }
    }
  });
}