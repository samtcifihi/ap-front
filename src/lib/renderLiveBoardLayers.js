import { render, renderComposite } from "@abstractplay/renderer";
import {
  isCompositeRenderRep,
  applySeatRotateToComposite,
  prepareDisplayRenderRep,
} from "./renderOutput.js";
import {
  prepareBoardRender,
  applyRenderSettingsToOptions,
} from "./prepareBoardRender.js";
import { resolveEffectiveRenderSettings } from "./resolveEffectiveRenderSettings.js";

function attachOffscreenContainer() {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  document.body.appendChild(container);
  return container;
}

/**
 * Render board SVG layer(s) off-screen (caller owns returned DOM nodes): one per frame,
 * each a single board or a composite. Only the last, live frame takes clicks and hover.
 *
 * @returns {{ layers: (Element | null)[], boardRenderIndex: number }}
 */
export function renderLiveBoardLayers({
  renderrep,
  metaGame,
  globalMe,
  seatRotate = 0,
  baseOptions,
  applyColourOpts,
  applyGlyphMap,
  canBoardClick,
  onBoardClick,
  stackExpanding,
  onStackColumnHover,
}) {
  const layers = [];
  const frames = Array.isArray(renderrep) ? [...renderrep] : [renderrep];
  for (let i = 0; i < frames.length; i++) {
    const rawRep = frames[i];
    const isTopFrame = i === frames.length - 1;
    const container = attachOffscreenContainer();
    if (isCompositeRenderRep(rawRep)) {
      let displayRep = prepareDisplayRenderRep(rawRep, globalMe, metaGame);
      displayRep = applySeatRotateToComposite(displayRep, seatRotate);
      const layerOptions = { ...baseOptions };
      delete layerOptions.rotate;
      applyColourOpts(layerOptions);
      const primaryPanel = rawRep.panels[0]?.render;
      if (primaryPanel) {
        applyGlyphMap(layerOptions, primaryPanel);
      }
      const primarySettings = resolveEffectiveRenderSettings(
        globalMe,
        metaGame,
        primaryPanel ?? {},
      );
      applyRenderSettingsToOptions(layerOptions, primarySettings);
      if (canBoardClick && isTopFrame) {
        layerOptions.boardClick = (panelId, row, col, piece) => {
          onBoardClick(row, col, piece, panelId);
        };
      }
      if (stackExpanding && isTopFrame && onStackColumnHover) {
        layerOptions.boardHover = (panelId, row, col) => {
          onStackColumnHover(col, row, panelId);
        };
      }
      renderComposite(displayRep, { ...layerOptions, divelem: container });
    } else {
      const { displayRep, renderSettings } = prepareBoardRender(
        rawRep,
        globalMe,
        metaGame,
      );
      const layerOptions = { ...baseOptions, rotate: seatRotate };
      applyColourOpts(layerOptions);
      applyGlyphMap(layerOptions, rawRep);
      applyRenderSettingsToOptions(layerOptions, renderSettings);
      if (stackExpanding && isTopFrame && onStackColumnHover) {
        layerOptions.boardHover = (row, col) => {
          onStackColumnHover(col, row);
        };
      }
      if (canBoardClick && isTopFrame) {
        layerOptions.boardClick = (row, col, piece) => {
          onBoardClick(row, col, piece);
        };
      }
      render(displayRep, { ...layerOptions, divelem: container });
    }
    layers.push(container.firstChild);
    document.body.removeChild(container);
  }
  return { layers, boardRenderIndex: Math.max(0, layers.length - 1) };
}
