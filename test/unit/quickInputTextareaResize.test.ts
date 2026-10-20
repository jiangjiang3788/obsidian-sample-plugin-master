import { setTextareaAutoHeight } from '@/features/quickinput/editor/fields/inputEvents';

describe('QuickInput long-form textarea layout', () => {
  it('coalesces repeated input and ref updates into one layout measurement per frame', () => {
    const element = document.createElement('textarea');
    document.body.appendChild(element);
    element.style.maxHeight = '200px';
    let reads = 0;
    Object.defineProperty(element, 'scrollHeight', {
      configurable: true,
      get: () => { reads++; return 600; },
    });
    const queued: FrameRequestCallback[] = [];
    const originalRequest = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => { queued.push(callback); return queued.length; };
    try {
      setTextareaAutoHeight(element, 118);
      setTextareaAutoHeight(element, 118);
      setTextareaAutoHeight(element, 118);
      expect(queued).toHaveLength(1);
      queued[0](0);
      expect(reads).toBe(1);
      expect(element.style.height).toBe('200px');
    } finally {
      window.requestAnimationFrame = originalRequest;
      element.remove();
    }
  });
});
