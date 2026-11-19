import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Icon, IconName } from './icon';

@Component({
  imports: [Icon],
  template: `<app-icon [name]="name" [size]="size" />`,
})
class Host {
  name: IconName = 'check';
  size = 18;
}

describe('Icon', () => {
  it('renders an aria-hidden svg with the requested size', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.size = 24;
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.querySelectorAll('path').length).toBe(1);
  });

  it('renders every path of a multi-path icon', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.name = 'trash';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('path').length).toBe(5);
  });

  it('has a drawn glyph for every new icon name', () => {
    const names: IconName[] = [
      'briefcase',
      'id-card',
      'coins',
      'building',
      'mail',
      'copy',
      'file-text',
      'user',
      'home',
      'calendar',
      'sparkle',
    ];
    const fixture = TestBed.createComponent(Host);
    for (const name of names) {
      fixture.componentInstance.name = name;
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('path').length, name).toBeGreaterThan(0);
    }
  });
});
