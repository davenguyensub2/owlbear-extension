import OBR, { buildImage, buildShape, buildText } from "@owlbear-rodeo/sdk";
import { createElement } from "../helpers/render-helper.js";
import { constants } from "../constants/constants.js";
import { eventDispatcher } from "../api/OBREventDispatcher.js";

const TRACKER_UI_SCHEMA = {
  HP: {
    widthGrid: 4,
    textYRatio: 0.35,
    handleYRatio: 0.85,
    fontSize: 60,
    maxVal: 100,
    defaultVal: "50",
  },
  CP: {
    widthGrid: 3,
    textYRatio: 0.05,
    handleYRatio: 0.85,
    fontSize: 45,
    maxVal: 50,
    defaultVal: "0",
  },
  DEFAULT: {
    widthGrid: 3,
    textYRatio: 0.05,
    handleYRatio: 0.85,
    fontSize: 45,
    maxVal: 50,
    defaultVal: "0",
  },
};

const processingHandles = new Set();
const processingPullers = new Set();

export class DiceThroneSetup {
  constructor() {
    this.container = createElement(
      "div",
      "dice-throne-setup-panel p-4 flex flex-col gap-4",
    );
    this.heroList = [];
    this.init();
  }

  async init() {
    // Render trạng thái loading ban đầu
    this.container.innerHTML = `<p class="text-xs italic text-gray-400">Đang tải dữ liệu từ Google Sheets...</p>`;

    try {
      const response = await fetch(constants.GAS_URL);
      this.heroList = await response.json();
      this.renderUI();
    } catch (e) {
      console.error("Lỗi fetch danh sách hero:", e);
      this.container.innerHTML = `<p class="text-red-500 text-xs">❌ Lỗi kết nối dữ liệu</p>`;
    }

    eventDispatcher.subscribe("scene.items.onchange", (items) =>
      this.handleItemsChange(items),
    );
  }

  async handleItemsChange(items) {
    let dices = [],
      diceTrays = [],
      cards = [],
      cardPullers = [],
      trackerHandles = [];

    for (const item of items) {
      if (!item.metadata) continue;

      // Phân loại item
      if (item.metadata.isDiceTray) diceTrays.push(item);
      else if (item.metadata.isDice) dices.push(item);
      else if (item.metadata.isCard) cards.push(item);
      else if (item.metadata.isCardPuller) cardPullers.push(item);
      else if (item.metadata.isTrackerHandle) trackerHandles.push(item);
    }

    const diceUpdates = await this.handleDiceChange(dices, diceTrays);
    const cardUpdates = await this.handleCardChange(cards, cardPullers);
    const trackerUpdates = await this.handleTrackerChange(trackerHandles);

    const allUpdates = [...diceUpdates, ...cardUpdates, ...trackerUpdates];

    if (allUpdates.length > 0) {
      await OBR.scene.items.updateItems(
        allUpdates.map((u) => u.id),
        (sceneItems) => {
          sceneItems.forEach((item) => {
            const data = allUpdates.find((u) => u.id === item.id);
            if (!data) return;

            if (data.position) {
              item.position.x = data.position.x;
              item.position.y = data.position.y;
            }
            if (data.metadata) {
              item.metadata = { ...item.metadata, ...data.metadata };
            }
            if (data.image && item.image) {
              item.image.url = data.image.url;
            }
            if (data.zIndex !== undefined) {
              item.zIndex = data.zIndex;
            }
            if (data.newTextContent !== undefined && item.text?.richText) {
              item.text.richText[0].children[0].text = data.newTextContent;
            }
            if (data.rotation !== undefined) {
              item.rotation = data.rotation;
            }
          });
        },
      );
    }
  }

  async handleDiceChange(dices, diceTrays) {
    const GRID_UNIT = 150;
    const updates = [];

    if (diceTrays.length === 0 || dices.length === 0) return [];

    for (const dice of dices) {
      const meta = dice.metadata || {};

      const curX = Math.round(dice.position.x);
      const curY = Math.round(dice.position.y);
      const lastX = Math.round(meta.lastX || 0);
      const lastY = Math.round(meta.lastY || 0);

      // Chặn loop bằng tọa độ (Rất an toàn cho Dice)
      if (curX === lastX && curY === lastY) continue;

      const isInAnyTray = diceTrays.some((tray) => {
        const width = tray.width || 6 * GRID_UNIT;
        const height = tray.height || 2 * GRID_UNIT;

        return (
          dice.position.x >= tray.position.x &&
          dice.position.x <= tray.position.x + width &&
          dice.position.y >= tray.position.y &&
          dice.position.y <= tray.position.y + height
        );
      });

      let targetUrl = dice.image.url;
      let targetRotation = dice.rotation || 0;

      if (isInAnyTray) {
        const faces = meta.faces || [];
        if (faces.length > 0) {
          // Đổi mặt xúc xắc
          targetUrl = faces[Math.floor(Math.random() * faces.length)];
          targetRotation = Math.random() * 90 - 90;
        }
      }

      updates.push({
        id: dice.id,
        image: { ...dice.image, url: targetUrl },
        rotation: targetRotation, // Thêm góc xoay vào update
        metadata: {
          ...meta,
          lastX: dice.position.x,
          lastY: dice.position.y,
        },
      });
    }

    return updates;
  }

  async handleCardChange(cards, cardPullers) {
    // console.log("handleCardChange", cards, cardPullers);
    const GRID_UNIT = 150;
    const updates = [];
    const DRAW_OFFSET = 9 * GRID_UNIT;

    if (cardPullers.length === 0 || cards.length === 0) return [];

    for (const puller of cardPullers) {
      const pMeta = puller.metadata || {};
      const pId = puller.id;

      // --- 1. CƠ CHẾ THÁO CỜ ---
      // Nếu Puller đã nhảy đến vị trí đích (lastX, lastY), tháo cờ để có thể rút tiếp
      if (
        puller.position.x === pMeta.lastX &&
        puller.position.y === pMeta.lastY
      ) {
        processingPullers.delete(pId);
        continue;
      }

      if (processingPullers.has(pId)) continue;

      // 2. Lọc các lá bài (Chỉ lấy những lá chưa rút: isCard === true)
      const cardsUnderPuller = cards.filter((card) => {
        const isUnder =
          Math.abs(card.position.x - puller.position.x) < GRID_UNIT && // Thu hẹp vùng check để chính xác hơn
          Math.abs(card.position.y - puller.position.y) < GRID_UNIT;
        return isUnder && card.metadata?.isCard === true;
      });

      if (cardsUnderPuller.length > 0) {
        // --- GẮN CỜ PULLER ---
        processingPullers.add(pId);

        // 3. Chọn bài ngẫu nhiên
        const randomIndex = Math.floor(Math.random() * cardsUnderPuller.length);
        const selectedCard = cardsUnderPuller[randomIndex];

        const newPosition = {
          x: puller.position.x + DRAW_OFFSET,
          y: puller.position.y + DRAW_OFFSET,
        };

        // 4. Cập nhật lá bài
        updates.push({
          id: selectedCard.id,
          position: newPosition,
          zIndex: Math.max(...cards.map((c) => c.zIndex || 0)) + 1,
          metadata: {
            ...selectedCard.metadata,
            isCard: false, // Đánh dấu đã rút
            isDrawn: true,
          },
        });

        // 5. Cập nhật Puller nhảy theo
        updates.push({
          id: pId,
          position: newPosition,
          metadata: {
            ...pMeta,
            lastX: newPosition.x,
            lastY: newPosition.y,
          },
        });

        // Sau khi rút 1 lá, dừng xử lý Puller này trong lượt này
        // (Đảm bảo tính "Atomic": 1 lần kéo = 1 lá)
        continue;
      } else {
        // Cập nhật lastX/lastY khi di chuyển Puller không trúng bài
        updates.push({
          id: pId,
          metadata: {
            ...pMeta,
            lastX: puller.position.x,
            lastY: puller.position.y,
          },
        });
      }
    }

    return updates;
  }

  async handleTrackerChange(handles) {
    const GRID_UNIT = 150;
    const updates = [];
    if (handles.length === 0) return updates;

    const parentIds = [...new Set(handles.map((h) => h.attachedTo))].filter(
      Boolean,
    );
    const parents = await OBR.scene.items.getItems(parentIds);

    // Ngưỡng kích hoạt (Thresholds)
    const THRESHOLD_1 = GRID_UNIT/2; // Kéo quá 50px thì bắt đầu tính là thay đổi
    const THRESHOLD_5 = 5 * GRID_UNIT; // Kéo quá 300px thì tính là thay đổi 5 đơn vị

    for (const handle of handles) {
      const meta = handle.metadata;
      const board = parents.find((p) => p.id === handle.attachedTo);
      if (!meta || !board) continue;

      // Tọa độ "Nhà" (Home)
      const homePos = {
        x: board.position.x + meta.offsetX,
        y: board.position.y + meta.offsetY,
      };

      // --- CƠ CHẾ THÁO CỜ ---
      if (this.isAtHome(handle.position, homePos)) {
        processingHandles.delete(handle.id);
        continue;
      }

      if (processingHandles.has(handle.id)) continue;

      // --- KIỂM TRA KÉO LỆCH (Trigger) ---
      const diffY = handle.position.y - homePos.y;
      const absDiffY = Math.abs(diffY);

      if (absDiffY > THRESHOLD_1) {
        // GẮN CỜ ID để tránh trigger liên tục khi đang xử lý
        processingHandles.add(handle.id);

        // 1. Xác định hướng (Kéo lên < 0 là TĂNG)
        const direction = diffY < 0 ? 1 : -1;

        // 2. Xác định lượng thay đổi (1 hoặc 5)
        const amount = absDiffY >= THRESHOLD_5 ? 5 : 1;
        const change = amount * direction;

        // 3. Lấy text item để cập nhật giá trị
        const textItems = await OBR.scene.items.getItems([meta.targetTextId]);
        const textItem = textItems[0];

        if (textItem?.text?.richText) {
          let oldVal =
            parseInt(textItem.text.richText[0].children[0].text) || 0;
          let newVal = oldVal + change;

          // Giới hạn giá trị (Clamp)
          const min = meta.minVal !== undefined ? meta.minVal : 0;
          const max = meta.maxVal !== undefined ? meta.maxVal : 50;
          newVal = Math.max(min, Math.min(max, newVal));

          // Nếu giá trị thực sự thay đổi thì mới đẩy update text
          if (newVal !== oldVal) {
            updates.push({
              id: meta.targetTextId,
              newTextContent: newVal.toString(),
            });
          }
        }

        // --- LUÔN RESET VỀ NHÀ ---
        updates.push({
          id: handle.id,
          position: homePos,
        });
      }
    }
    return updates;
  }

  // Hàm hỗ trợ kiểm tra vị trí (giống isAtHome trong code của bạn)
  isAtHome(currentPos, homePos, tolerance = 5) {
    return (
      Math.abs(currentPos.x - homePos.x) < tolerance &&
      Math.abs(currentPos.y - homePos.y) < tolerance
    );
  }

  // Helper xử lý URL để vượt lỗi CORS của Google Drive
  // Dùng proxy corsproxy.io hoặc api.allorigins.win tùy bạn chọn
  proxyUrl(url) {
    if (!url || !url.includes("drive.google.com")) return url;

    const id = url.split("id=")[1] || url.split("/d/")[1]?.split("/")[0];
    // Cấu trúc link này của Google thường hỗ trợ hiển thị trực tiếp tốt hơn
    return `https://lh3.googleusercontent.com/d/${id}`;
  }
  renderUI() {
    this.container.innerHTML = "";

    const label = createElement(
      "label",
      "text-white text-sm font-bold mb-1",
      "Chọn Anh Hùng:",
    );
    const select = createElement(
      "select",
      "bg-gray-800 text-white p-2 rounded border border-gray-600 outline-none focus:border-blue-500",
    );

    const defaultOpt = createElement("option", "", "-- Danh sách nhân vật --");
    defaultOpt.value = "";
    select.appendChild(defaultOpt);

    this.heroList.forEach((hero) => {
      const option = createElement("option", "", hero.name);
      option.value = hero.id;
      select.appendChild(option);
    });

    const setupBtn = createElement(
      "button",
      "bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-all mt-2",
      "BẮT ĐẦU SETUP",
    );

    // Lắng nghe sự kiện (Tránh dùng inline onclick để không vi phạm CSP)
    setupBtn.addEventListener("click", () => {
      const selectedId = select.value;
      const selectedName = select.options[select.selectedIndex].text;
      if (selectedId) {
        this.handleSetup(selectedId, selectedName);
      } else {
        alert("Vui lòng chọn một nhân vật!");
      }
    });

    this.container.appendChild(label);
    this.container.appendChild(select);
    this.container.appendChild(setupBtn);
  }

  async handleSetup(heroId, heroName) {
    try {
      const response = await fetch(`${constants.GAS_URL}?heroId=${heroId}`);
      const heroData = await response.json();
      const heroKey = heroName.toLowerCase().replace(/\s+/g, "_");
      await this.spawnHero(heroKey, heroData, heroName);
    } catch (e) {
      console.error("Lỗi khi fetch chi tiết hero:", e);
    }
  }

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  getImageDimensions(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ w: img.naturalWidth || 300, h: img.naturalHeight || 300 });
      };
      img.onerror = () => {
        console.warn(`[429/Error] Dùng size mặc định cho: ${url}`);
        resolve({ w: 300, h: 300 });
      };
      img.src = url;
    });
  }

  async spawnHero(heroKey, heroData, heroName) {
    try {
      console.log(`🚀 Bắt đầu Setup cho ${heroName}...`);
      const itemsToSpawn = [];
      const GRID_UNIT = 150;
      let currentX = 0;

      // 1. Board & Leaflets (Cố định, đo từng cái)
      const boardRes = await this.setupBoards(
        heroKey,
        heroData.folders.board?.files,
        currentX,
      );
      itemsToSpawn.push(...boardRes.items);
      currentX = boardRes.nextX;

      await this.sleep(500);

      const leafletRes = await this.setupLeaflets(
        heroKey,
        heroData.folders.leaflet?.files,
        currentX,
      );
      itemsToSpawn.push(...leafletRes.items);
      currentX = leafletRes.nextX;

      await this.sleep(500);

      // 2. Cards (Tối ưu: Chỉ đo 1 lần cho cả xấp)
      const cardRes = await this.setupCards(
        heroKey,
        heroData.folders.cards?.files,
        currentX,
      );
      itemsToSpawn.push(...cardRes.items);
      currentX = cardRes.nextX;

      await this.sleep(500);

      // 3. Tokens (Tối ưu: Chỉ đo 1 lần)
      const tokenRes = await this.setupTokens(
        heroKey,
        heroData.folders.token?.files,
        currentX,
      );
      itemsToSpawn.push(...tokenRes.items);
      currentX = tokenRes.nextX;

      await this.sleep(500);

      // 4. Dice & Tray
      const diceRes = await this.setupDiceSystem(
        heroKey,
        heroData.folders.dice?.files,
        currentX,
      );
      itemsToSpawn.push(...diceRes.items);
      currentX = diceRes.nextX;

      await this.sleep(500);

      // 5. Tracker
      const trackerRes = await this.setupTrackers(
        heroKey,
        heroData.folders.extra?.files,
        currentX,
      );
      itemsToSpawn.push(...trackerRes.items);

      await this.sleep(500);

      // --- CUỐI CÙNG: Đẩy tất cả lên Scene một lần duy nhất ---
      if (itemsToSpawn.length > 0) {
        await OBR.scene.items.addItems(itemsToSpawn);
        console.log(`✅ Triệu hồi ${heroName} thành công!`);
      }
    } catch (error) {
      console.error("Lỗi tại spawnHero:", error);
    }
  }

  async setupBoards(heroKey, boardFiles, startX) {
    const GRID_UNIT = 150;
    const items = [];
    let currentX = startX;

    // Lấy danh sách file ảnh trong folder board
    const files = Object.values(boardFiles || {});
    if (files.length === 0) return { items: [], nextX: startX };

    console.log(`--- Setup Boards cho ${heroKey} ---`);

    for (const [index, rawUrl] of files.entries()) {
      const url = this.proxyUrl(rawUrl);

      // 1. Đo kích thước Board (Board cần chính xác nên đo từng cái)
      const dim = await this.getImageDimensions(url);

      // Tính toán Scale dựa trên chiều rộng mong muốn (ví dụ Board thường là 17 ô Grid)
      const desiredWidthGrid = 17;
      const scale = (desiredWidthGrid * GRID_UNIT) / dim.w;

      // 2. Build Item Board
      const boardItem = buildImage(
        { url, width: dim.w, height: dim.h, mime: "image/webp" },
        { dpi: GRID_UNIT, offset: { x: 0, y: 0 } },
      )
        .id(`${heroKey}_board_${index}`)
        .position({ x: currentX * GRID_UNIT, y: 0 })
        .scale({ x: scale, y: scale })
        .layer("CHARACTER")
        .name(
          index === 0
            ? "Hero Board (Front)"
            : `Hero Board (State ${index + 1})`,
        )
        .metadata({ isBoard: true })
        .build();

      items.push(boardItem);

      // 3. Cập nhật tọa độ X cho cái tiếp theo (cộng thêm 1 ô đệm)
      currentX += desiredWidthGrid + 1;

      await this.sleep(100);
    }

    return { items, nextX: currentX };
  }

  async setupLeaflets(heroKey, leafletFiles, startX) {
    const GRID_UNIT = 150;
    const items = [];
    let currentX = startX;

    const files = Object.values(leafletFiles || {});
    if (files.length === 0) return { items: [], nextX: startX };

    for (const [index, rawUrl] of files.entries()) {
      const url = this.proxyUrl(rawUrl);
      const dim = await this.getImageDimensions(url);

      // Leaflet thường nhỏ hơn Board, mình để tầm 10 ô Grid chiều rộng
      const desiredWidthGrid = 10;
      const scale = (desiredWidthGrid * GRID_UNIT) / dim.w;

      const leaflet = buildImage(
        { url, width: dim.w, height: dim.h, mime: "image/webp" },
        { dpi: GRID_UNIT, offset: { x: 0, y: 0 } },
      )
        .id(`${heroKey}_leaflet_${index}`)
        .position({ x: currentX * GRID_UNIT, y: 0 })
        .scale({ x: scale, y: scale })
        .layer("CHARACTER")
        .name(`Leaflet ${index + 1}`)
        .build();

      items.push(leaflet);
      currentX += desiredWidthGrid + 1; // Nhảy tiếp sang phải
    }

    return { items, nextX: currentX };
  }

  async setupCards(heroKey, cardFiles, startX) {
    const GRID_UNIT = 150;
    const items = [];
    const files = Object.values(cardFiles || {});

    if (files.length === 0) return { items: [], nextX: startX };

    // 1. Đo lá bài đầu tiên
    const firstUrl = this.proxyUrl(files[0]);
    const cardDim = await this.getImageDimensions(firstUrl);

    const desiredCardWidth = 2.5; // Đơn vị ô Grid
    const scale = (desiredCardWidth * GRID_UNIT) / cardDim.w;
    const finalWidth = desiredCardWidth * GRID_UNIT;
    const finalHeight = cardDim.h * scale;

    // 2. Spawn các lá bài (Xếp chồng)
    for (const [index, rawUrl] of files.entries()) {
      const url = this.proxyUrl(rawUrl);
      const card = buildImage(
        { url, width: cardDim.w, height: cardDim.h, mime: "image/webp" },
        { dpi: GRID_UNIT, offset: { x: 0, y: 0 } },
      )
        .id(`${heroKey}_card_${index}`)
        .position({ x: startX * GRID_UNIT, y: 0 })
        .scale({ x: scale, y: scale })
        .layer("CHARACTER")
        .metadata({ isCard: true, hero: heroKey })
        .zIndex(index)
        .build();

      items.push(card);
    }

    // 3. TẠO CARD PULLER (Hình vuông điều khiển)
    // Chúng ta tạo một cái Shape bao quanh chồng bài
    const { buildShape } = await import("@owlbear-rodeo/sdk"); // Đảm bảo đã import

    const cardPuller = buildShape()
      .id(`${heroKey}_card_puller`)
      .shapeType("RECTANGLE")
      .width(finalWidth)
      .height(finalHeight)
      .fillColor("#00ffcc") // Màu xanh neon dễ thấy
      .fillOpacity(0.3) // Làm mờ để vẫn thấy bài bên dưới
      .strokeColor("#ffffff")
      .strokeWidth(2)
      .position({ x: (startX + desiredCardWidth + 1) * GRID_UNIT, y: 0 })
      .layer("MOUNT") // Đặt ở layer cao hơn để dễ nắm kéo
      .name("Kéo để rút bài")
      .metadata({
        isCardPuller: true,
        hero: heroKey,
        lastX: (startX + desiredCardWidth + 1) * GRID_UNIT, // Lưu tọa độ ban đầu để chặn loop onChange
        lastY: 0,
      })
      .build();

    items.push(cardPuller);

    // Trả về nextX (cách ra một chút để phần Token không bị dính vào Puller)
    return {
      items,
      nextX: startX + desiredCardWidth * 2 + 2,
    };
  }

  async setupTokens(heroKey, tokenFiles, startX) {
    const GRID_UNIT = 150;
    const items = [];
    const files = Object.values(tokenFiles || {});
    if (files.length === 0) return { items: [], nextX: startX };

    const firstUrl = this.proxyUrl(files[0]);
    const dim = await this.getImageDimensions(firstUrl);
    const scale = (1 * GRID_UNIT) / dim.w;

    let col = 0;
    let row = 0;
    const MAX_ROWS = 7;
    const AMOUNT_PER_TOKEN = 10; // Số lượng mỗi loại

    for (const [fileIndex, rawUrl] of files.entries()) {
      const url = this.proxyUrl(rawUrl);

      // Vòng lặp nhân bản 10 cái cho mỗi loại token
      for (let i = 0; i < AMOUNT_PER_TOKEN; i++) {
        const token = buildImage(
          { url, width: dim.w, height: dim.h, mime: "image/webp" },
          { dpi: GRID_UNIT, offset: { x: 0, y: 0 } },
        )
          // ID phải là duy nhất, thêm i vào đuôi
          .id(`${heroKey}_token_${fileIndex}_${i}`)
          .position({
            x: (startX + col) * GRID_UNIT,
            // Thêm một chút offset y (ví dụ 2px) nếu bạn muốn chúng xếp chồng lệch nhau cho đẹp
            y: row * 2 * GRID_UNIT,
          })
          .scale({ x: scale, y: scale })
          .layer("CHARACTER")
          // Cài zIndex để cái sau nằm trên cái trước trong chồng 10 cái
          .zIndex(i)
          .metadata({ isToken: true, hero: heroKey })
          .build();

        items.push(token);
      }

      // Sau khi xong 10 cái của 1 loại, mới nhảy sang hàng/cột tiếp theo
      row++;
      if (row >= MAX_ROWS) {
        row = 0;
        col++;
      }
    }

    return { items, nextX: startX + col + 2 };
  }

  async setupDiceSystem(heroKey, diceFiles, startX) {
    const GRID_UNIT = 150;
    const items = [];
    const files = Object.values(diceFiles || {});
    if (files.length === 0) return [];

    // 1. Xử lý Proxy và lấy kích thước xúc xắc (đo 1 lần cho cả bộ 5 viên)
    const firstDiceUrl = this.proxyUrl(files[0]);
    const diceDim = await this.getImageDimensions(firstDiceUrl);

    // Scale xúc xắc sao cho nó chiếm khoảng 0.8 ô Grid (nhỏ hơn 1 ô để nhìn rõ khay)
    const diceScale = (0.8 * GRID_UNIT) / diceDim.w;

    // 2. TẠO DICE TRAY
    const trayWidth = 6 * GRID_UNIT; // Rộng hơn một chút để chứa 5 viên thoải mái
    const trayHeight = 6 * GRID_UNIT;

    // Đặt Tray ở phía trên (Y = 0)
    const trayPos = { x: startX * GRID_UNIT, y: 0 };

    const tray = buildShape()
      .id(`${heroKey}_dice_tray`)
      .shapeType("RECTANGLE")
      .width(trayWidth)
      .height(trayHeight)
      .fillColor("#222222")
      .fillOpacity(0.5)
      .position(trayPos)
      .metadata({ isDiceTray: true, hero: heroKey })
      .name(`${heroKey} Dice Tray`)
      .build();
    items.push(tray);

    // 3. TẠO 5 VIÊN XÚC XẮC
    // Đặt xúc xắc ở DƯỚI khay (cách một đoạn) để không trigger roll ngay lập tức
    const diceSpawnY = trayHeight + 1 * GRID_UNIT; // Cách khay 1 ô Grid

    for (let i = 0; i < 5; i++) {
      const posX = (startX + i + 0.5) * GRID_UNIT;

      const dice = buildImage(
        {
          url: firstDiceUrl,
          width: diceDim.w,
          height: diceDim.h,
          mime: "image/webp",
        },
        { dpi: GRID_UNIT, offset: { x: 0, y: 0 } },
      )
        .id(`${heroKey}_dice_${i}`)
        .position({ x: posX, y: diceSpawnY })
        .scale({ x: diceScale, y: diceScale })
        .metadata({
          isDice: true,
          hero: heroKey,
          faces: files.map((url) => this.proxyUrl(url)), // Proxy toàn bộ các mặt để dùng khi roll
          lastX: posX,
          lastY: diceSpawnY,
        })
        .layer("CHARACTER")
        .build();

      items.push(dice);
    }

    console.log(
      `🎲 Đã tạo hệ thống xúc xắc cho ${heroKey} (Xúc xắc nằm ngoài khay)`,
    );
    return { items, nextX: startX + 8 };
  }

  async setupTrackers(heroKey, extraFiles, startX) {
    const GRID_UNIT = 150;
    const items = [];
    const files = Object.entries(extraFiles || {});
    if (files.length === 0) return { items: [], nextX: startX };

    let currentX = startX;

    for (const [fileName, rawUrl] of files) {
      const nameLoweCase = fileName.toLowerCase();

      // Lọc các file tracker
      if (!["hp", "cp", "tracker"].some((key) => nameLoweCase.includes(key)))
        continue;

      // 1. Xác định Schema dựa trên loại file
      const type = nameLoweCase.includes("hp")
        ? "HP"
        : nameLoweCase.includes("cp")
          ? "CP"
          : "DEFAULT";
      const schema = TRACKER_UI_SCHEMA[type];

      const url = this.proxyUrl(rawUrl);
      const dim = await this.getImageDimensions(url);

      // Tính toán kích thước thực tế sau scale
      const boardWidth = schema.widthGrid * GRID_UNIT;
      const scale = boardWidth / dim.w;
      const boardHeight = dim.h * scale;

      const boardPos = { x: currentX * GRID_UNIT, y: 0 };

      // 2. Tạo Board (Gốc tọa độ)
      const board = buildImage(
        { url, width: dim.w, height: dim.h, mime: "image/webp" },
        { dpi: GRID_UNIT, offset: { x: 0, y: 0 } },
      )
        .id(`${heroKey}_${fileName}_board`)
        .position(boardPos)
        .scale({ x: scale, y: scale })
        .layer("CHARACTER")
        .zIndex(0)
        .metadata({ isTrackerBoard: true, hero: heroKey })
        .build();
      items.push(board);

      // 3. Tạo Text (Sử dụng tỉ lệ từ Schema)
      const textOffsetY = boardHeight * schema.textYRatio;

      const textWidth = boardWidth;
      const statusText = buildText()
        .id(`${heroKey}_${fileName}_text`)
        .width(textWidth)
        .richText([
          {
            type: "paragraph",
            children: [{ text: schema.defaultVal }],
          },
        ])
        .position({
          x: boardPos.x,
          y: boardPos.y + textOffsetY,
        })
        .textAlign("CENTER")
        .fontSize(schema.fontSize)
        .layer("ATTACHMENT")
        .zIndex(2)
        .attachedTo(board.id)
        .locked(true)
        .build();
      items.push(statusText);

      // 4. Tạo Handle (Sử dụng tỉ lệ từ Schema)
      const handleOffsetX = boardWidth / 2;
      const handleOffsetY = boardHeight * schema.handleYRatio;

      const handle = buildShape()
        .id(`${heroKey}_${fileName}_handle`)
        .shapeType("CIRCLE")
        .width(100) // Nút kéo vừa phải, không cần to bằng GRID_UNIT
        .height(100)
        .position({
          x: boardPos.x + handleOffsetX,
          y: boardPos.y + handleOffsetY,
        })
        .fillColor("#ff0000")
        .layer("ATTACHMENT")
        .zIndex(3)
        .attachedTo(board.id)
        .metadata({
          isTrackerHandle: true,
          hero: heroKey,
          targetTextId: statusText.id,
          // LƯU OFFSET ĐỂ SO SÁNH TRONG handleTrackerChange
          offsetX: handleOffsetX,
          offsetY: handleOffsetY,
          minVal: 0,
          maxVal: schema.maxVal,
          lastY: boardPos.y + handleOffsetY, // Dùng để chặn loop khởi đầu
        })
        .build();
      items.push(handle);

      currentX += schema.widthGrid + 1; // Khoảng cách giữa các board
    }

    return { items, nextX: currentX };
  }
  getElement() {
    return this.container;
  }
}
