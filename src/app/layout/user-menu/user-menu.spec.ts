import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/ui/theme.service';
import { UserMenu } from './user-menu';

describe('UserMenu', () => {
  let fixture: ComponentFixture<UserMenu>;
  let signOut: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({ imports: [UserMenu] }).compileComponents();
    TestBed.inject(AuthService).login('admin', 'admin123');
    fixture = TestBed.createComponent(UserMenu);
    signOut = vi.fn<() => void>();
    fixture.componentInstance.signOut.subscribe(signOut);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
  });

  afterEach(() => fixture.destroy());

  const el = () => fixture.nativeElement as HTMLElement;
  const trigger = () => el().querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement;
  const items = () => Array.from(el().querySelectorAll<HTMLElement>('[role="menuitem"]'));
  const key = (target: HTMLElement, k: string) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  const flush = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('shows the username and starts closed', () => {
    expect(el().textContent).toContain('admin');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(el().querySelector('[role="menu"]')).toBeNull();
  });

  it('opens on click with aria state and focuses the first item', async () => {
    trigger().click();
    await flush();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    const menu = el().querySelector('[role="menu"]') as HTMLElement;
    expect(trigger().getAttribute('aria-controls')).toBe(menu.id);
    expect(items().length).toBe(2);
    expect(menu.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(items()[0]);
  });

  it('opens with ArrowUp on the last item and ArrowDown on the first', async () => {
    key(trigger(), 'ArrowUp');
    await flush();
    expect(document.activeElement).toBe(items()[1]);
    key(items()[1], 'Escape');

    key(trigger(), 'ArrowDown');
    await flush();
    expect(document.activeElement).toBe(items()[0]);
  });

  it('moves with arrows and Home/End, wrapping', async () => {
    trigger().click();
    await flush();

    key(items()[0], 'ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    key(items()[1], 'ArrowDown');
    expect(document.activeElement).toBe(items()[0]);
    key(items()[0], 'End');
    expect(document.activeElement).toBe(items()[1]);
    key(items()[1], 'Home');
    expect(document.activeElement).toBe(items()[0]);
  });

  it('closes on Escape and refocuses the button', async () => {
    trigger().click();
    await flush();

    key(items()[0], 'Escape');

    expect(el().querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('closes on Tab and on outside click', async () => {
    trigger().click();
    await flush();
    key(items()[0], 'Tab');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    trigger().click();
    await flush();
    document.body.click();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('toggles the theme from the menu', async () => {
    const theme = TestBed.inject(ThemeService);
    theme.mode.set('light');
    trigger().click();
    await flush();
    expect(items()[0].textContent?.trim()).toBe('Dark theme');
    expect(items()[0].getAttribute('aria-label')).toBe('Switch to dark theme');
    expect(items()[0].className).toContain('whitespace-nowrap');
    expect((el().querySelector('[role="menu"]') as HTMLElement).className).toContain('min-w-44');

    items()[0].click();
    fixture.detectChanges();

    expect(theme.mode()).toBe('dark');

    trigger().click();
    await flush();
    expect(items()[0].textContent?.trim()).toBe('Light theme');
    expect(items()[0].getAttribute('aria-label')).toBe('Switch to light theme');
  });

  it('emits signOut and closes', async () => {
    trigger().click();
    await flush();

    items()[1].click();
    fixture.detectChanges();

    expect(signOut).toHaveBeenCalled();
    expect(el().querySelector('[role="menu"]')).toBeNull();
  });
});
