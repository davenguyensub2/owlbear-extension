// import OBR, { buildCurve, buildLabel } from "@owlbear-rodeo/sdk";

// // ID cố định để chúng ta có thể xóa/ghi đè chính xác
// const PATH_ID = "com.distance-tracker.path";
// const LABEL_ID = "com.distance-tracker.label";

// let initialPosition = null;
// let currentTargetId = null;

// OBR.onReady(() => {
//   // 1. NGƯỜI DÙNG SELECT -> TRIGGER PLAYER.ONCHANGE
//   OBR.player.onChange(async (player) => {
//     const selection = player.selection;

//     if (selection && selection.length === 1) {
//       const id = selection[0];
//       const items = await OBR.scene.items.getItems([id]);
//       const item = items[0];

//       // 2. LỌC CHARACTER & 3. LƯU TỌA ĐỘ BAN ĐẦU
//       if (item && item.layer === "CHARACTER") {
//         if (currentTargetId !== id) {
//           currentTargetId = id;
//           initialPosition = item.position;
//         }
//       }
//     } else {
//       // 7. NGƯỜI DÙNG BỎ CHỌN -> XÓA PATH
//       currentTargetId = null;
//       initialPosition = null;
//       await OBR.scene.local.deleteItems([PATH_ID, LABEL_ID]);
//     }
//   });

//   // 4. NGƯỜI DÙNG THẢ TOKEN -> TRIGGER ITEMS.ONCHANGE
//   OBR.scene.items.onChange(async (items) => {
//     if (!initialPosition || !currentTargetId) return;

//     const draggedItem = items.find((i) => i.id === currentTargetId);
//     if (draggedItem) {
//       // 5 & 6. VẼ/VẼ LẠI PATH TỪ ĐIỂM BAN ĐẦU
//       await drawPath(initialPosition, draggedItem.position);
//     }
//   });
// });

// async function drawPath(start, end) {
//   const gridDpi = await OBR.scene.grid.getDpi();
//   const scale = await OBR.scene.grid.getScale();
//   const player = await OBR.player.getName(); // Hoặc lấy màu từ OBR.player.getColor()

//   // Tính khoảng cách
//   const deltaX = Math.abs(end.x - start.x) / gridDpi;
//   const deltaY = Math.abs(end.y - start.y) / gridDpi;

//   // 2. Tính theo luật D&D 5e Standard: Đi chéo bằng đi thẳng
//   // Khoảng cách (ô) = Max của DeltaX và DeltaY
//   const cellDistance = Math.max(deltaX, deltaY);

//   // 3. Nhân với giá trị của một ô (thường là 5ft)
//   const actualDist = (
//     Math.round(cellDistance) * scale.parsed.multiplier
//   ).toFixed(0);
//   // 1. Vẽ đường cong với tension = 0 (tạo thành đường thẳng)
//   const line = buildCurve()
//     .id(PATH_ID)
//     .points([start, end])
//     .strokeColor("#00FFFF") // Màu xanh neon
//     .fillOpacity(0)
//     .strokeWidth(gridDpi / 15)
//     .tension(0) // QUAN TRỌNG: Làm cho đường kẻ thẳng tắp
//     .layer("GRID")
//     .zIndex(100)
//     .build();

//   // 2. Vẽ Label (nhãn dán)
//   const label = buildLabel()
//     .id(LABEL_ID)
//     .position({ x: start.x, y: start.y})
//     .plainText(`${actualDist} ${scale.parsed.unit}`)
//     .pointerHeight(0) // Không có cái chân trỏ xuống
//     .backgroundOpacity(1)
//     .layer("GRID")
//     .zIndex(101)
//     .disableHit(true)
//     .build();

//   await OBR.scene.local.addItems([line, label]);
// }
