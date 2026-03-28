import '@testing-library/jest-dom/vitest';
import { beforeAll, vi } from 'vitest';

process.env.TZ = 'UTC';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const originalPointerEvent = globalThis.PointerEvent;

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  vi.stubGlobal(
    'PointerEvent',
    originalPointerEvent ??
      class PointerEventMock extends MouseEvent {
        pointerType = 'mouse';
      },
  );

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });

  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });

  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});
