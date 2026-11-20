import { ToastService } from './toast.service';

describe('ToastService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds notifications with unique ids and the requested variant', () => {
    const service = new ToastService();

    service.show('First', 'warning');
    service.show('Second', 'danger');

    const [first, second] = service.toasts();
    expect(first.variant).toBe('warning');
    expect(second.variant).toBe('danger');
    expect(first.id).not.toBe(second.id);

    service.dismiss(first.id);
    service.dismiss(second.id);
  });

  it('defaults to the info variant', () => {
    const service = new ToastService();

    service.show('Heads up');

    expect(service.toasts()[0].variant).toBe('info');
    service.dismiss(service.toasts()[0].id);
  });

  it('auto-dismisses after the timeout', () => {
    vi.useFakeTimers();
    const service = new ToastService();

    service.show('Temporary', 'success');
    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(3500);

    expect(service.toasts()).toHaveLength(0);
  });

  it('removes a notification immediately on dismiss', () => {
    const service = new ToastService();

    service.show('Bye');
    const id = service.toasts()[0].id;
    service.dismiss(id);

    expect(service.toasts()).toHaveLength(0);
  });

  it('ignores dismissal of an unknown id', () => {
    const service = new ToastService();

    expect(() => service.dismiss(999)).not.toThrow();
    expect(service.toasts()).toHaveLength(0);
  });
});
