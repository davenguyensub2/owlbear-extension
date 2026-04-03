import {
  proxyUrl,
  generateId,
  getImageDimensions,
  isNear,
  sleep,
  TRACKER_SETTINGS,
} from "./dicethrone-general-helper";
import OBR, { buildImage, buildShape, buildText } from "@owlbear-rodeo/sdk";

const GRID_UNIT = 150;

export class DiceThroneHeroSetupHelper {
  constructor() {}

  async setupHero(heroKey, heroData) {
    let currentX = 0;
    const items = [];
    const setupList = [];
    // setupList.push("leaflet");
    // setupList.push("board");
    // setupList.push("token");
    // setupList.push("cardTray");
    // setupList.push("card");
    // setupList.push("cardRevealArea");
    setupList.push("tracker");
    // setupList.push("dice");
    // setupList.push("diceTray");
    // setupList.push("extra");

    // --- SETUP LEAFLET ---
    if (setupList.includes("leaflet")) {
      const leafletFiles = Object.values(
        heroData.folders.leaflet.files,
      ).reverse();
      const leafletOptions = { desiredSize: { w: 10, h: 1 } };
      const leafletRes = await this.setupComponent(
        heroKey,
        leafletFiles,
        { x: currentX, y: 0 },
        leafletOptions,
      );
      currentX += leafletRes.width + 1;
      items.push(...leafletRes.items);
    }

    // --- SETUP BOARD ---
    if (setupList.includes("board")) {
      const boardFiles = Object.values(heroData.folders.board.files).reverse();
      const boardOptions = {
        desiredSize: { w: 17, h: 1 },
        layer: "MOUNT",
        metadata: { isCardRevealArea: true },
      };
      const boardRes = await this.setupComponent(
        heroKey,
        boardFiles,
        { x: currentX, y: 0 },
        boardOptions,
      );
      currentX += boardRes.width + 1;
      items.push(...boardRes.items);
    }

    // --- SETUP TOKEN ---
    if (setupList.includes("token")) {
      const tokenFiles = Object.values(heroData.folders.token.files);
      const tokenOptions = {
        desiredSize: { w: 1.5, h: 1.5 },
        amountPerFile: 10,
      };
      const tokenRes = await this.setupComponent(
        heroKey,
        tokenFiles,
        { x: currentX, y: 0 },
        tokenOptions,
      );
      currentX += tokenRes.width + 1;
      items.push(...tokenRes.items);
    }

    // --- SETUP CARD ---
    // 1. Tray
    if (setupList.includes("cardTray")) {
      const cardTrayRes = await this.setupCardTray(heroKey, {
        x: currentX,
        y: 0,
      });
      currentX += cardTrayRes.width + 1;
      items.push(...cardTrayRes.items);
    }

    // 2. Cards
    if (setupList.includes("card")) {
      const cardFiles = Object.values(heroData.folders.cards.files);
      const cardOptions = {
        desiredSize: { w: 2.5, h: 1 },
        isStack: true,
        metadata: { isCard: true },
      };
      const cardRes = await this.setupComponent(
        heroKey,
        cardFiles,
        { x: currentX, y: 0 },
        cardOptions,
      );
      currentX += cardRes.width + 1;
      items.push(...cardRes.items);
    }

    // 3. Reveal area
    if (setupList.includes("cardRevealArea")) {
      const cardRevealAreaOptions = {
        shapeType: "RECTANGLE",
        strokeWidth: 10,
        strokeColor: "#FFFF00",
        layer: "MOUNT",
        fillOpacity: 0.5,
        metadata: { isCardRevealArea: true },
        desiredSize: { w: 10, h: 10 },
      };

      const cardRevealArea = await this.setupShape(
        heroKey,
        { x: currentX, y: 0 },
        cardRevealAreaOptions,
      );
      currentX += cardRevealArea.width + 1;
      items.push(cardRevealArea);
    }

    // --- SETUP TRACKER ---
    const rawExtraFiles = Object.values(heroData.folders.extra.files || {});
    const trackerFiles = heroData.folders.extra.files.filter((f) => f.toLowerCase().includes("tracker"));
    console.log(trackerFiles)
    const extraFiles = rawExtraFiles.filter(
      (f) => !f.toLowerCase().includes("tracker"),
    );
    if (setupList.includes("tracker")) {
      const trackerRes = await this.setupTracker(heroKey, trackerFiles, { x: currentX, y: 0 });
      currentX += trackerRes.width + 1;
      items.push(...trackerRes.items);
    }

    // --- SETUP DICE ---
    if (setupList.includes("dice")) {
      const diceFiles = Object.values(heroData.folders.dice.files);
      const diceOptions = {
        diceWidthInGrid: 0.8,
        amount: 5,
        offsetY: 1.5,
        faces: diceFiles.map((f) => proxyUrl(f)),
      }
      const diceRes = await this.setupComponent(
        heroKey,
        diceFiles,
        { x: currentX, y: 0 },
        diceOptions,
      );
      currentX += diceRes.width + 1;
      items.push(...diceRes.items);
    }

    if (items.length > 0) await OBR.scene.items.addItems(items);
  }

  async setupCardTray(heroKey, startPos) {
    const cardTrayAreaDesiredSize = { w: 3.5, h: 5 };
    const cardTrayAreaOptions = {
      shapeType: "RECTANGLE",
      strokeWidth: 10,
      strokeColor: "#FFFF00",
      layer: "MOUNT",
      fillOpacity: 0.5,
      metadata: { isCardTray: true },
      desiredSize: { w: 3.5, h: 5 },
    };
    const cardTrayArea = await this.setupShape(
      heroKey,
      startPos,
      cardTrayAreaOptions,
    );

    const cardTrayPullerHandleOptions = {
      shapeType: "CIRCLE",
      strokeWidth: 10,
      strokeColor: "#ff0000",
      fillColor: "#ff0000",
      layer: "TEXT",
      metadata: { isCardTrayPullerHandle: true },
      desiredSize: { w: 1, h: 1 },
      parentId: cardTrayArea.id,
    };
    const cardTrayPullerHandleStartPos = {
      x: startPos.x + cardTrayAreaDesiredSize.w / 2,
      y: startPos.y + cardTrayAreaDesiredSize.h / 2,
    };
    const cardTrayPullerHandle = await this.setupShape(
      heroKey,
      cardTrayPullerHandleStartPos,
      cardTrayPullerHandleOptions,
    );

    return { items: [cardTrayArea, cardTrayPullerHandle], width: 3.5 };
  }

  async setupTracker(heroKey, trackerFiles, startPos) {
    let width = 0;
    const items = [];
    for (const fileUrl of trackerFiles) {
      const fileName = fileUrl.toLowerCase();

      let type = "default";
      if (fileName.includes("hp")) type = "hp";

      const config = TRACKER_SETTINGS[type];
      const trackerMainTileRes = await this.setupComponent(
        heroKey,
        [fileUrl],
        { x: currentX, y: 0 },
        {
          desiredSize: config.desiredSize,
          metadata: {
            isTracker: true
          }
        },
      );
      items.push(...trackerMainTileRes.items);

      const trackerLabelOptions = {
        parentId: trackerMainTileRes.items[0].id,
      }
      const trackerLabelPos = {
        x: trackerMainTileRes.items[0].position.x + config.textOffset.x,
        y: trackerMainTileRes.items[0].position.y + config.textOffset.y
      }
      const trackerLabel = await this.setupText(heroKey, trackerLabelPos, trackerLabelOptions);
      items.push(trackerLabel);
      
      const trackerHandleOptions = {
        shapeType: "CIRCLE",
        strokeWidth: 10,
        strokeColor: "#ff0000",
        fillColor: "#ff0000",
        layer: "TEXT",
        metadata: { isTrackerHandle: true },
        desiredSize: { w: 1, h: 1 },
        parentId: trackerLabel.id
      }
      const trackerHandlePos = {
        x: trackerMainTileRes.items[0].position.x + config.handleOffset.x,
        y: trackerMainTileRes.items[0].position.y + config.handleOffset.y
      }
      const trackerHandle = await this.setupShape(heroKey, trackerHandlePos, trackerHandleOptions);
      items.push(trackerHandle);
      
      width += trackerMainTileRes.items[0].width;
      currentX += config.desiredSize.w + 1;
    }
    return { items, width };
  }

  async setupShape(heroKey, startPos, options = {}) {
    const {
      strokeWidth = 10,
      strokeColor = "#FFFFFF",
      layer = "MOUNT",
      zIndexBase = 0,
      shapeType = "RECTANGLE",
      metadata = {},
      desiredSize = { w: 1, h: 1 },
      fillOpacity = 1,
      fillColor = null,
      parentId = null,
    } = options;

    const shapeItemBuilder = buildShape()
      .id(`${heroKey}_shape_${generateId()}`)
      .shapeType(shapeType)
      .position({ x: startPos.x * GRID_UNIT, y: startPos.y * GRID_UNIT })
      .strokeColor(strokeColor)
      .strokeWidth(strokeWidth)
      .fillOpacity(fillOpacity)
      .layer(layer)
      .zIndex(zIndexBase)
      .metadata(metadata)
      .width(desiredSize.w * GRID_UNIT)
      .height(desiredSize.h * GRID_UNIT);
    if (fillColor) shapeItemBuilder.fillColor(fillColor);
    if (parentId) shapeItemBuilder.attachedTo(parentId);

    return shapeItemBuilder.build();
  }

  async setupText(heroKey, startPos, options = {}) {
    const {
      text = "0",
      fontSize = 24,
      textAlign = "CENTER",
      layer = "ATTACHMENT",
      zIndexBase = 2,
      metadata = {},
      width = 150,
      parentId = null,
      offsetY = 0,
    } = options;

    const textItemBuilder = buildText()
      .id(`${heroKey}_text_${this.generateId()}`)
      .width(width)
      .richText([
        {
          type: "paragraph",
          children: [{ text: text.toString() }], // Đảm bảo là string
        },
      ])
      .position({
        x: startPos.x * GRID_UNIT,
        y: (startPos.y + offsetY) * GRID_UNIT,
      })
      .textAlign(textAlign)
      .fontSize(fontSize)
      .layer(layer)
      .zIndex(zIndexBase)
      .metadata({ ...metadata, hero: heroKey })
      .disableHit(true)
      .locked(true);
    if (parentId) textItemBuilder.attachedTo(parentId);

    return textItemBuilder.build();
  }

  async setupComponent(heroKey, files, startPos, options = {}) {
    const {
      desiredSize = { w: 1, h: 1 },
      layer = "CHARACTER",
      isStack = false,
      amountPerFile = 1,
      metadata = {},
      zIndexBase = 0,
    } = options;

    const items = [];
    const fileList = Object.values(files || {});
    if (fileList.length === 0) return { items: [] };

    const firstUrl = proxyUrl(fileList[0]);
    const dim = await getImageDimensions(firstUrl);

    const scale = (desiredSize.w * GRID_UNIT) / dim.w;
    const finalH = (dim.h * scale) / GRID_UNIT;

    let currentX = startPos.x;
    let currentY = startPos.y;

    for (const [fIndex, rawUrl] of fileList.entries()) {
      const url = proxyUrl(rawUrl);

      for (let i = 0; i < amountPerFile; i++) {
        const posX = currentX * GRID_UNIT;
        const posY = currentY * GRID_UNIT;

        // --- BUILD IMAGE ---
        const mainItem = buildImage(
          { url, width: dim.w, height: dim.h, mime: "image/webp" },
          { dpi: GRID_UNIT, offset: { x: 0, y: 0 } },
        )
          .id(`${heroKey}_${fIndex}_${i}_${generateId()}`)
          .position({ x: posX, y: posY })
          .scale({ x: scale, y: scale })
          .layer(layer)
          .zIndex(isStack ? zIndexBase - fIndex : zIndexBase + i)
          .metadata({ ...metadata, hero: heroKey })
          .build();

        items.push(mainItem);
      }

      if (!isStack) {
        currentY += finalH + 1;
      }
    }

    return { items, width: desiredSize.w };
  }
}
