/// <reference lib="dom" />

/**
 * Must load before any `@testing-library/*` import so `screen` binds to `document.body`.
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM(
  "<!DOCTYPE html><html><head></head><body></body></html>",
  {
    url: "http://localhost/",
    pretendToBeVisual: true,
  },
);

const { window } = dom;

globalThis.window = window as unknown as Window & typeof globalThis;
globalThis.document = window.document;
globalThis.navigator = window.navigator;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
globalThis.SVGElement = window.SVGElement;
globalThis.HTMLAnchorElement = window.HTMLAnchorElement;
globalThis.XMLHttpRequest = window.XMLHttpRequest;
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
globalThis.getComputedStyle = window.getComputedStyle.bind(window);

globalThis.ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
