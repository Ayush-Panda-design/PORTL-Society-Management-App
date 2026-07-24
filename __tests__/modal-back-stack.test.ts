import {
  dismissTopModal,
  hasOpenModal,
  pushModalDismiss,
  subscribeModalStack,
} from '@/lib/modal-back-stack';

describe('modal-back-stack', () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    while (cleanups.length) {
      cleanups.pop()?.();
    }
  });

  it('starts empty and reports no open modal', () => {
    expect(hasOpenModal()).toBe(false);
    expect(dismissTopModal()).toBe(false);
  });

  it('dismisses LIFO; unregister removes from stack', () => {
    const first = jest.fn();
    const second = jest.fn();
    const unsubFirst = pushModalDismiss(first);
    const unsubSecond = pushModalDismiss(second);
    cleanups.push(unsubFirst, unsubSecond);

    expect(hasOpenModal()).toBe(true);
    expect(dismissTopModal()).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();

    // Production sheets unregister on close; simulate that here.
    unsubSecond();
    expect(hasOpenModal()).toBe(true);

    expect(dismissTopModal()).toBe(true);
    expect(first).toHaveBeenCalledTimes(1);
    unsubFirst();
    expect(hasOpenModal()).toBe(false);
    cleanups.length = 0;
  });

  it('notifies subscribers on push and unregister', () => {
    const listener = jest.fn();
    const unsubListener = subscribeModalStack(listener);
    cleanups.push(unsubListener);

    const dismiss = jest.fn();
    const unregister = pushModalDismiss(dismiss);
    cleanups.push(unregister);

    expect(listener).toHaveBeenCalled();
    listener.mockClear();

    unregister();
    expect(listener).toHaveBeenCalled();

    unsubListener();
    const leftover = pushModalDismiss(jest.fn());
    cleanups.push(leftover);
    // Unsubscribed listener should not fire again.
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
