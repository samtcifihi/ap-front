import { resolveEffectiveRenderSettings } from "./resolveEffectiveRenderSettings.js";
import {
  getDisplayRenderRep,
  resolveDisplayRenderRep,
} from "./getDisplayRenderRep.js";
import { effectiveFlags, flagSetIncludes } from "./effectiveGameFlags.js";

/** @param {unknown} rep */
export function isCompositeRenderRep(rep) {
  return (
    typeof rep === "object" &&
    rep !== null &&
    !Array.isArray(rep) &&
    rep.kind === "composite"
  );
}

/** @param {unknown} rep */
export function isMultiFrameRenderRep(rep) {
  return Array.isArray(rep);
}

/**
 * The frame on show by default: the last of a multi-frame render, or the render itself.
 * Either may be a single board or a composite.
 * @param {import('@abstractplay/gameslib').APRenderGameOutput | null | undefined} rep
 */
export function liveRenderFrame(rep) {
  return Array.isArray(rep) ? rep.at(-1) : rep;
}

/** @param {import('@abstractplay/gameslib').APRenderGameOutput | null | undefined} rep */
export function usesStackExpanding(rep) {
  const frame = liveRenderFrame(rep);
  if (frame == null) {
    return false;
  }
  if (isCompositeRenderRep(frame)) {
    return frame.panels.some(
      (p) => p.render?.renderer === "stacking-expanding",
    );
  }
  return frame.renderer === "stacking-expanding";
}

/**
 * Whether stack-expanding UI (#stack, boardHover) is active for this render.
 * Re-derived each sync so display switches (e.g. 3D → expanding) are not stuck off.
 *
 * @param {string} metaGame
 * @param {{ getFlags?: () => string[] } | null | undefined} engine
 * @param {import('@abstractplay/gameslib').APRenderGameOutput | null | undefined} render
 */
export function stackExpandingForRender(metaGame, engine, render) {
  const flags = effectiveFlags(engine, metaGame);
  return (
    flagSetIncludes(flags, "stacking-expanding") && usesStackExpanding(render)
  );
}

const COMPOSITE_ROTATES = new Set([0, 90, 180, 270]);

/** @param {number} deg */
function normalizePanelRotate(deg) {
  const n = ((Math.round(deg) % 360) + 360) % 360;
  return COMPOSITE_ROTATES.has(n) ? n : 0;
}

/**
 * @param {import('@abstractplay/gameslib').APRenderComposite} composite
 * @param {number} seatRotateDeg
 */
export function applySeatRotateToComposite(composite, seatRotateDeg) {
  if (!seatRotateDeg) {
    return composite;
  }
  return {
    ...composite,
    panels: composite.panels.map((panel) => ({
      ...panel,
      rotate: normalizePanelRotate((panel.rotate ?? 0) + seatRotateDeg),
    })),
  };
}

/**
 * @param {import('@abstractplay/gameslib').APRenderGameOutput | null | undefined} rawRep
 * @param {object | null | undefined} globalMe
 * @param {string} metaGame
 */
export function prepareDisplayRenderRep(rawRep, globalMe, metaGame) {
  if (rawRep == null) {
    return rawRep;
  }
  if (isCompositeRenderRep(rawRep)) {
    return {
      ...rawRep,
      panels: rawRep.panels.map((panel) => {
        const settings = resolveEffectiveRenderSettings(
          globalMe,
          metaGame,
          panel.render,
        );
        return {
          ...panel,
          render: getDisplayRenderRep(panel.render, settings),
        };
      }),
    };
  }
  return resolveDisplayRenderRep(rawRep, globalMe, metaGame);
}

/**
 * Single rep used for rotation increment and glyph defaults when output is composite or multi-frame.
 * @param {import('@abstractplay/gameslib').APRenderGameOutput | null | undefined} rep
 */
export function primaryRenderRepForUi(rep) {
  const frame = liveRenderFrame(rep);
  if (frame == null) {
    return null;
  }
  if (isCompositeRenderRep(frame)) {
    return frame.panels[0]?.render ?? null;
  }
  return frame;
}
