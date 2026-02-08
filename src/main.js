// import OBR from "@owlbear-rodeo/sdk";

// OBR.interaction.startItemInteraction

// OBR.onReady(() => {
//   let isDragging = false;
//   let startPosition = { x: 0, y: 0 };

//   // Sử dụng vòng lặp 60fps của trình duyệt để "bắt" hành động kéo
//   const updateLoop = async () => {
//     const selection = await OBR.player.getSelection();

//     console.log(selection);
//     if (selection && selection.length > 0) {
//       // 1. Lấy tọa độ CHUỘT (Pointer) - Luôn thay đổi khi bạn di chuyển
      
//       // 2. Lấy tọa độ ITEM - Chỉ thay đổi SAU KHI THẢ (nhưng ta cần nó làm điểm gốc)
//       const items = await OBR.scene.items.getItems(selection);
//       const item = items[0];

//       if (item) {
//         if (1) {
//           isDragging = true;
//           startPosition = item.position; // Điểm bắt đầu cố định
//           console.log("Bắt đầu kéo từ:", startPosition);
//         }

//         // ĐÂY LÀ NƠI PHÉP MÀU XẢY RA:
//         // pointerPos chính là nơi cái Token đang 'đu bám' theo
        
//         // Bạn gọi hàm vẽ đường kẻ từ startPosition đến pointerPos ở đây
//         // renderDistance(startPosition, pointerPos);
//       }
//     } else {
//       if (1) {
//         isDragging = false;
//         console.log("Đã thả chuột, kết thúc đo đạc.");
//         // clearGraphics();
//       }
//     }
    
//     requestAnimationFrame(updateLoop);
//   };

//   updateLoop();
// });