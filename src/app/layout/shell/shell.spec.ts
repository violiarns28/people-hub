import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { IdleTimeoutService } from '../../core/auth/idle-timeout.service';
import { ThemeService } from '../../core/ui/theme.service';
import { Shell } from './shell';

describe('Shell', () => {
  let fixture: ComponentFixture<Shell>;
  let auth: AuthService;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [provideRouter([])],
    }).compileComponents();

    auth = TestBed.inject(AuthService);
    auth.login('admin', 'admin123');
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  const el = () => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(selector: string) => el().querySelector(selector) as T;

  it('puts the skip link first and renders main with an outlet', () => {
    const first = el().querySelector('a, button') as HTMLAnchorElement;

    expect(first.textContent).toContain('Skip to content');
    expect(q('main#main router-outlet')).toBeTruthy();
  });

  it('shows the Employees nav link and the signed-in user', () => {
    expect(q('nav a').textContent).toContain('Employees');
    expect(el().textContent).toContain('admin');
  });

  it('opens and closes the drawer, making content inert while open', () => {
    const menu = q<HTMLButtonElement>('button[aria-controls="primary-nav"]');
    const content = q('main').parentElement as HTMLElement;

    menu.click();
    fixture.detectChanges();
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    expect(content.hasAttribute('inert')).toBe(true);
    expect(q('.scrim')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(content.hasAttribute('inert')).toBe(false);
    expect(q('.scrim')).toBeNull();
  });

  it('renders brand divider, workspace ornament and crossfading theme icons', () => {
    expect(q('aside > div').classList).toContain('border-b');
    expect(q('.workspace-card').textContent).toContain('PeopleHub workspace');
    expect(q('.workspace-card app-icon')).toBeTruthy();
    expect(el().querySelectorAll('.theme-icons app-icon').length).toBe(2);
    expect(q('.nav-link').classList).toContain('press');
  });

  it('closes the drawer from the scrim', () => {
    q<HTMLButtonElement>('button[aria-controls="primary-nav"]').click();
    fixture.detectChanges();

    q('.scrim').click();
    fixture.detectChanges();

    expect(q('.scrim')).toBeNull();
  });

  it('toggles the theme from the mobile topbar with an accurate label', () => {
    const theme = TestBed.inject(ThemeService);
    theme.mode.set('light');
    fixture.detectChanges();
    const button = q<HTMLButtonElement>('.theme-toggle');
    expect(button.getAttribute('aria-label')).toBe('Switch to dark theme');

    button.click();
    fixture.detectChanges();

    expect(theme.mode()).toBe('dark');
    expect(button.getAttribute('aria-label')).toBe('Switch to light theme');
  });

  it('opens the sign out confirm dialog from the user menu', () => {
    const shell = fixture.componentInstance as any;
    q<HTMLButtonElement>('app-user-menu button[aria-haspopup="menu"]').click();
    fixture.detectChanges();

    const items = Array.from(el().querySelectorAll<HTMLElement>('[role="menuitem"]'));
    items.find((i) => i.textContent?.includes('Sign out'))!.click();
    fixture.detectChanges();

    expect(shell.signOutOpen()).toBe(true);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('asks for confirmation before signing out', () => {
    const shell = fixture.componentInstance as any;
    expect(shell.signOutOpen()).toBe(false);

    shell.askSignOut();
    expect(shell.signOutOpen()).toBe(true);
    expect(auth.isAuthenticated()).toBe(true);

    shell.signOut();
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login']);
  });

  it('starts idle tracking and stops on destroy', () => {
    const idle = TestBed.inject(IdleTimeoutService);
    const stop = vi.spyOn(idle, 'stop');

    fixture.destroy();

    expect(stop).toHaveBeenCalled();
  });

  it('collapses and expands the desktop sidebar and remembers the choice', () => {
    localStorage.removeItem('peoplehub.sidebar.collapsed');
    const toggle = q<HTMLButtonElement>('.side-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Collapse sidebar');

    toggle.click();
    fixture.detectChanges();
    expect(q('aside').classList).toContain('collapsed');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Expand sidebar');
    expect(localStorage.getItem('peoplehub.sidebar.collapsed')).toBe('1');

    toggle.click();
    fixture.detectChanges();
    expect(q('aside').classList).not.toContain('collapsed');
    expect(localStorage.getItem('peoplehub.sidebar.collapsed')).toBe('0');
  });

  it('links the brand mark and name to the homepage', () => {
    const links = Array.from(el().querySelectorAll<HTMLAnchorElement>('a.brand-link'));
    expect(links.length).toBe(2);
    for (const link of links) {
      expect(link.getAttribute('href')).toBe('/employees');
      expect(link.getAttribute('aria-label')).toBe('PeopleHub home');
    }
  });
});
