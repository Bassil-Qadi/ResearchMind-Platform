/**
 * Extra setup for the component tests in tests/ui, which run in jsdom.
 *
 * Every test file loads this. The matchers are harmless in Node, and the rest
 * only applies where there is a window.
 */
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

if (typeof window !== 'undefined') {
  // Tests replace fetch per case; never let one case's stub leak into the next.
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const proto = window.Element.prototype

  // jsdom has no top layer, so nothing can ever be modal, fullscreen or an open
  // popover. Floating UI (under every Radix menu and select) asks
  // matches(':modal') while positioning, and jsdom's selector engine answers it
  // by testing :fullscreen element by element: one select opening made 75
  // million calls and took about 20 seconds.
  const TOP_LAYER = new Set([':modal', ':fullscreen', ':popover-open'])
  const matches = proto.matches
  proto.matches = function (this: Element, selectors: string) {
    return TOP_LAYER.has(selectors) ? false : matches.call(this, selectors)
  }

  // Radix's Select and DropdownMenu call these, and jsdom does not implement them.
  proto.hasPointerCapture     ??= () => false
  proto.setPointerCapture     ??= () => {}
  proto.releasePointerCapture ??= () => {}
  proto.scrollIntoView        ??= () => {}

  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver

  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
