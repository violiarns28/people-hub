import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Illustration, IllustrationName } from './illustration';

@Component({
  imports: [Illustration],
  template: `<app-illustration
    [name]="name()"
    [size]="size()"
    [decorative]="decorative()"
    label="Org chart"
    [fluid]="fluid()"
    [animated]="animated()"
    [tone]="tone()"
  />`,
})
class Host {
  readonly name = signal<IllustrationName>('org');
  readonly size = signal(200);
  readonly decorative = signal(true);
  readonly fluid = signal(false);
  readonly animated = signal(false);
  readonly tone = signal<'default' | 'on-brand'>('on-brand');
}

describe('Illustration', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = () => fixture.nativeElement as HTMLElement;
    return { fixture, el };
  }

  it('renders every scene as an svg with its own viewBox', () => {
    const { fixture, el } = setup();
    const scenes = [
      'org',
      'team',
      'empty',
      'secure',
      'skyline',
      'document',
      'notfound',
      'success',
    ] as const;
    for (const name of scenes) {
      fixture.componentInstance.name.set(name);
      fixture.detectChanges();
      const svg = el().querySelector('svg') as SVGElement;
      expect(svg.getAttribute('viewBox')).toBe(name === 'skyline' ? '0 0 640 120' : '0 0 320 240');
      expect(svg.querySelectorAll('rect, path, circle').length).toBeGreaterThan(5);
    }
  });

  it('fluid fills the width and slices instead of using the size input', () => {
    const { fixture, el } = setup();
    fixture.componentInstance.name.set('skyline');
    fixture.componentInstance.fluid.set(true);
    fixture.detectChanges();
    const host = el().querySelector('app-illustration') as HTMLElement;
    const svg = el().querySelector('svg') as SVGElement;
    expect(host.classList).toContain('fluid');
    expect(host.style.width).toBe('');
    expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMax slice');
  });

  it('animated adds the float class hook and is off by default', () => {
    const { fixture, el } = setup();
    const host = el().querySelector('app-illustration') as HTMLElement;
    expect(host.classList).not.toContain('animated');
    fixture.componentInstance.name.set('document');
    fixture.componentInstance.animated.set(true);
    fixture.detectChanges();
    expect(host.classList).toContain('animated');
    expect(el().querySelectorAll('svg .float').length).toBeGreaterThan(0);
  });

  it('switches tone between default and on-brand', () => {
    const { fixture, el } = setup();
    const host = el().querySelector('app-illustration') as HTMLElement;
    fixture.componentInstance.tone.set('default');
    fixture.detectChanges();
    expect(host.classList).not.toContain('on-brand');
    fixture.componentInstance.tone.set('on-brand');
    fixture.detectChanges();
    expect(host.classList).toContain('on-brand');
  });

  it('is decorative by default and sets the width from size', () => {
    const { el } = setup();
    const svg = el().querySelector('svg') as SVGElement;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
    expect((el().querySelector('app-illustration') as HTMLElement).style.width).toBe('200px');
  });

  it('exposes an accessible name when not decorative', () => {
    const { fixture, el } = setup();
    fixture.componentInstance.decorative.set(false);
    fixture.detectChanges();
    const svg = el().querySelector('svg') as SVGElement;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Org chart');
    expect(svg.getAttribute('aria-hidden')).toBeNull();
  });

  it('supports the on-brand tone and uses only solid fills', () => {
    const { el } = setup();
    const host = el().querySelector('app-illustration') as HTMLElement;
    expect(host.classList).toContain('on-brand');
    expect(host.innerHTML).not.toMatch(/url\(|filter/i);
  });
});
