import OBR from "@owlbear-rodeo/sdk";

import { trackTargetInfo } from "./services/target-info-tracker.js";
import { trackCharacterMoving } from "./services/character-moving-tracker.js";
import { trackStatModifying } from "./services/stat-mod-tracker.js";

import { AppLayout } from "./components/Layout.js";
import { MetadataEditor } from "./components/MetadataEditor.js";
import { AIConsole } from "./components/AIConsole.js";
import { Settings } from "./components/Settings.js";
import { StacksControl } from "./components/StacksControl.js";
import { eventDispatcher } from "./api/OBREventDispatcher.js";
import { RandomTool } from "./components/RandomTool.js";

eventDispatcher.init();

// background services
trackCharacterMoving();
trackStatModifying();

const metadataEditor = new MetadataEditor();
const aiConsole = new AIConsole();
const settings = new Settings();
const stacksControl = new StacksControl();
const randomTool = new RandomTool();

const layout = new AppLayout();

// layout.addTab('⚙️', () => {
//     layout.setContent(settings.getElement());
// });

layout.addTab('👥', () => {
    layout.setContent(metadataEditor.getElement());
})

layout.addTab('🎲', () => {
    layout.setContent(randomTool.getElement());
})

layout.addTab('🃏', () => {
    layout.setContent(stacksControl.getElement());
})

layout.render();