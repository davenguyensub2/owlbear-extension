import OBR from "@owlbear-rodeo/sdk";

import { trackTargetInfo } from "./services/target-info-tracker.js";
import { trackCharacterMoving } from "./services/character-moving-tracker.js";

import { AppLayout } from "./components/Layout.js";
import { MetadataEditor } from "./components/MetadataEditor.js";
import { AIConsole } from "./components/AIConsole.js";
import { Settings } from "./components/Settings.js";

import { eventDispatcher } from "./api/OBREventDispatcher.js";

eventDispatcher.init();

// background services
trackCharacterMoving();

const metadataEditor = new MetadataEditor();
const aiConsole = new AIConsole();
const settings = new Settings();

const layout = new AppLayout();

layout.addTab('⚙️', () => {
    layout.setContent(settings.getElement());
});

layout.addTab('👥', () => {
    layout.setContent(metadataEditor.getElement());
})

layout.addTab('✦', () => {
    layout.setContent(aiConsole.getElement());
})

layout.render();