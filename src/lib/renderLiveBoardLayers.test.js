import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@abstractplay/renderer", async (importOriginal) => {
  const actual = await importOriginal();
  const draw = (_json, opts) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    opts.divelem.appendChild(svg);
    return svg;
  };
  return { ...actual, render: vi.fn(draw), renderComposite: vi.fn(draw) };
});

import { render, renderComposite } from "@abstractplay/renderer";
import { renderLiveBoardLayers } from "./renderLiveBoardLayers.js";

const miniRep = () => ({
  renderer: "stacking-expanding",
  board: { style: "squares", width: 2, height: 2 },
  legend: { A: { name: "piece", paint: { fill: 1 } } },
  pieces: "AA\nAA",
});

const composite = () => ({
  kind: "composite",
  layout: { arrangement: "row" },
  panels: [
    { id: "yard", render: miniRep() },
    { id: "rack", render: miniRep() },
  ],
});

const layersFor = (renderrep, onBoardClick, onStackColumnHover) =>
  renderLiveBoardLayers({
    renderrep,
    metaGame: "test",
    globalMe: null,
    baseOptions: { svgid: "theBoardSVG" },
    applyColourOpts: () => {},
    applyGlyphMap: () => {},
    canBoardClick: true,
    onBoardClick,
    stackExpanding: true,
    onStackColumnHover,
  });

describe("renderLiveBoardLayers", () => {
  beforeEach(() => {
    render.mockClear();
    renderComposite.mockClear();
  });

  it("draws every frame of a multi-frame composite render, the last taking clicks and hover", () => {
    const onBoardClick = vi.fn();
    const onStackColumnHover = vi.fn();
    const { layers, boardRenderIndex } = layersFor(
      [composite(), composite(), composite()],
      onBoardClick,
      onStackColumnHover,
    );
    expect(layers).to.have.length(3);
    expect(layers.every((layer) => layer?.tagName === "svg")).to.equal(true);
    expect(boardRenderIndex).to.equal(2);
    expect(render).not.toHaveBeenCalled();
    expect(renderComposite).toHaveBeenCalledTimes(3);
    const optionsOf = (call) => renderComposite.mock.calls[call][1];
    for (const call of [0, 1]) {
      expect(optionsOf(call).boardClick).to.equal(undefined);
      expect(optionsOf(call).boardHover).to.equal(undefined);
      expect(optionsOf(call)).to.not.have.property("rotate");
    }
    // The live frame passes the panel a click or hover landed on through to the game.
    optionsOf(2).boardClick("rack", 0, 1, "s1M");
    expect(onBoardClick).toHaveBeenCalledWith(0, 1, "s1M", "rack");
    optionsOf(2).boardHover("yard", 3, 4);
    expect(onStackColumnHover).toHaveBeenCalledWith(4, 3, "yard");
  });

  it("still draws a lone composite, and frames of single boards, as before", () => {
    expect(layersFor(composite(), vi.fn(), vi.fn()).boardRenderIndex).to.equal(0);
    expect(renderComposite).toHaveBeenCalledTimes(1);
    expect(renderComposite.mock.calls[0][1].boardClick).to.be.a("function");
    const { layers, boardRenderIndex } = layersFor([miniRep(), miniRep()], vi.fn(), vi.fn());
    expect(layers).to.have.length(2);
    expect(boardRenderIndex).to.equal(1);
    expect(render).toHaveBeenCalledTimes(2);
    expect(render.mock.calls[0][1].boardClick).to.equal(undefined);
    expect(render.mock.calls[1][1].boardClick).to.be.a("function");
  });
});
