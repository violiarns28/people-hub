import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IllustrationName =
  'org' | 'team' | 'empty' | 'secure' | 'skyline' | 'document' | 'notfound' | 'success';
export type IllustrationTone = 'default' | 'on-brand';

/**
 * Flat illustrations drawn for this app: solid fills, 2px ink strokes. Colours come from the
 * design tokens through local custom properties, so light, dark and the brand panel all work.
 */
@Component({
  selector: 'app-illustration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'illustration inline-block max-w-full leading-none',
    '[class.on-brand]': "tone() === 'on-brand'",
    '[class.animated]': 'animated()',
    '[class.fluid]': 'fluid()',
    '[style.width.px]': 'fluid() ? null : size()',
  },
  styles: `
    :host {
      --il-brand: var(--c-brand);
      --il-soft: var(--c-brand-soft);
      --il-ink: var(--c-ink);
      --il-line: var(--c-line);
      --il-surface: var(--c-surface);
      --il-surface2: var(--c-surface-2);
      --il-bg: var(--c-ink-3);
      --il-dark: var(--c-ink-2);
    }
    :host(.fluid) {
      display: block;
      width: 100%;
      height: 100%;
    }
    :host(.fluid) svg {
      height: 100%;
    }
    :host(.on-brand) {
      --il-brand: var(--c-brand-hover);
      --il-soft: var(--c-brand-soft);
      --il-ink: var(--c-brand-hover);
      --il-line: var(--c-line);
      --il-surface: var(--c-on-brand);
      --il-surface2: var(--c-brand-soft);
      --il-bg: var(--c-on-brand);
      --il-handle: var(--c-on-brand);
      --il-dark: var(--c-brand-hover);
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
    }
    .k {
      stroke: var(--il-ink);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .bg {
      fill: none;
      stroke: var(--il-bg);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .nf {
      fill: none;
    }
    .brand {
      fill: var(--il-brand);
    }
    .soft {
      fill: var(--il-soft);
    }
    .ink {
      fill: var(--il-ink);
    }
    .line {
      fill: var(--il-line);
    }
    .surf {
      fill: var(--il-surface);
    }
    .surf2 {
      fill: var(--il-surface2);
    }
    .white {
      fill: var(--c-on-brand);
    }
    .handle {
      fill: none;
      stroke: var(--il-handle, var(--il-ink));
      stroke-width: 8;
      stroke-linecap: round;
    }
    .dark {
      fill: var(--il-dark);
    }
    .kw {
      fill: none;
      stroke: var(--c-on-brand);
      stroke-width: 5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .dash {
      stroke-dasharray: 6 6;
    }
    .float {
      transform-box: fill-box;
      transform-origin: center;
    }
    :host(.animated) .float {
      animation: il-float 6s ease-in-out infinite;
    }
    :host(.animated) .float.d2 {
      animation-delay: -2s;
    }
    :host(.animated) .float.d3 {
      animation-delay: -4s;
    }
    @keyframes il-float {
      0%,
      100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-4px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :host(.animated) .float {
        animation: none;
      }
    }
    .bgfill {
      fill: var(--il-bg);
    }
  `,
  template: `
    <svg
      [attr.viewBox]="name() === 'skyline' ? '0 0 640 120' : '0 0 320 240'"
      [attr.preserveAspectRatio]="fluid() ? 'xMidYMax slice' : 'xMidYMid meet'"
      xmlns="http://www.w3.org/2000/svg"
      [attr.role]="decorative() ? null : 'img'"
      [attr.aria-hidden]="decorative() ? 'true' : null"
      [attr.aria-label]="decorative() ? null : label()"
      focusable="false"
    >
      @switch (name()) {
        @case ('org') {
          <path class="bg" d="M160 76V113M60 113H260M60 113V150M160 113V150M260 113V150" />
          <g transform="translate(160 50)">
            <g class="float">
              <rect class="brand k" x="-44" y="-28" width="88" height="56" rx="10" />
              <circle class="surf k" cx="0" cy="-9" r="7" />
              <path class="surf k" d="M-14 18V13a14 11 0 0 1 28 0V18z" />
            </g>
          </g>
          @for (x of [60, 160, 260]; track x) {
            <g [attr.transform]="'translate(' + x + ' 176)'">
              <rect class="surf k" x="-40" y="-26" width="80" height="52" rx="10" />
              <circle class="soft k" cx="0" cy="-9" r="7" />
              <path class="soft k" d="M-13 17V13a13 11 0 0 1 26 0V17z" />
            </g>
          }
          <path class="bg" d="M20 222H300" />
          <circle class="bgfill" cx="28" cy="40" r="3" />
          <circle class="bgfill" cx="292" cy="64" r="3" />
          <circle class="bgfill" cx="40" cy="92" r="2" />
        }
        @case ('team') {
          <rect class="surf2 k" x="20" y="96" width="56" height="110" rx="4" />
          <rect class="soft k" x="82" y="130" width="40" height="76" rx="4" />
          <rect class="soft k" x="200" y="58" width="62" height="148" rx="4" />
          <rect class="surf2 k" x="268" y="116" width="36" height="90" rx="4" />
          @for (y of [112, 132, 152, 172]; track y) {
            <rect class="line" x="30" [attr.y]="y" width="10" height="8" rx="1" />
            <rect class="line" x="56" [attr.y]="y" width="10" height="8" rx="1" />
          }
          @for (y of [74, 94, 114, 134, 154]; track y) {
            <rect class="surf" x="212" [attr.y]="y" width="10" height="8" rx="1" />
            <rect class="surf" x="240" [attr.y]="y" width="10" height="8" rx="1" />
          }
          <path class="bg" d="M8 206H312" />
          <g class="float">
            <path class="brand k" d="M54 180V162Q54 134 82 134Q110 134 110 162V180Z" />
            <circle class="surf2 k" cx="82" cy="116" r="15" />
            <path class="ink" d="M67 114a15 15 0 0 1 30 0c-9-6-21-6-30 0z" />
          </g>
          <g class="float d2">
            <path class="surf k" d="M132 180V158Q132 130 160 130Q188 130 188 158V180Z" />
            <circle class="surf2 k" cx="160" cy="112" r="15" />
            <path class="ink" d="M145 110a15 15 0 0 1 30 0c-9 4-21 4-30 0z" />
          </g>
          <g class="float d3">
            <path class="soft k" d="M210 180V162Q210 134 238 134Q266 134 266 162V180Z" />
            <circle class="surf2 k" cx="238" cy="116" r="15" />
            <path class="ink" d="M223 118a15 15 0 0 1 30 0c-3-9-27-9-30 0z" />
          </g>
          <rect class="surf k" x="40" y="176" width="240" height="12" rx="3" />
          <path class="k nf" d="M60 188V206M260 188V206" />
          <path class="brand k" d="M140 176V156a3 3 0 0 1 3-3h34a3 3 0 0 1 3 3V176z" />
          <circle class="surf" cx="160" cy="165" r="3" />
        }
        @case ('empty') {
          <circle class="soft" cx="160" cy="120" r="100" />
          <rect class="surf k" x="94" y="30" width="132" height="168" rx="12" />
          <rect class="brand k" x="132" y="22" width="56" height="20" rx="6" />
          @for (y of [64, 96, 128]; track y) {
            <circle class="line k" cx="116" [attr.cy]="y" r="6" />
            <rect class="line" x="132" [attr.y]="y - 8" width="76" height="6" rx="3" />
            <rect class="line" x="132" [attr.y]="y + 2" width="48" height="6" rx="3" />
          }
          <path class="handle" d="M244 196l24 24" />
          <circle class="surf k" cx="222" cy="172" r="34" />
          <path class="k nf" d="M208 172h28" />
        }
        @case ('skyline') {
          @for (t of backTowers; track t[0]) {
            <rect
              class="soft"
              [attr.x]="t[0]"
              [attr.y]="104 - t[2]"
              [attr.width]="t[1]"
              [attr.height]="t[2]"
            />
          }
          @for (t of midTowers; track t[0]) {
            <rect
              class="brand k"
              [attr.x]="t[0]"
              [attr.y]="104 - t[2]"
              [attr.width]="t[1]"
              [attr.height]="t[2]"
              rx="2"
            />
            @for (r of rows(t[2]); track r) {
              <rect
                class="white"
                [attr.x]="t[0] + 8"
                [attr.y]="104 - t[2] + 10 + r * 14"
                width="6"
                height="6"
                rx="1"
              />
              <rect
                class="white"
                [attr.x]="t[0] + t[1] - 14"
                [attr.y]="104 - t[2] + 10 + r * 14"
                width="6"
                height="6"
                rx="1"
              />
            }
          }
          @for (t of frontTowers; track t[0]) {
            <rect
              class="dark k"
              [attr.x]="t[0]"
              [attr.y]="104 - t[2]"
              [attr.width]="t[1]"
              [attr.height]="t[2]"
              rx="2"
            />
            @for (r of rows(t[2]); track r) {
              <rect
                class="soft"
                [attr.x]="t[0] + 8"
                [attr.y]="104 - t[2] + 10 + r * 14"
                width="8"
                height="6"
                rx="1"
              />
              <rect
                class="soft"
                [attr.x]="t[0] + t[1] - 16"
                [attr.y]="104 - t[2] + 10 + r * 14"
                width="8"
                height="6"
                rx="1"
              />
            }
          }
          <path class="k nf" d="M215 40V22M509 46V30" />
          <circle class="brand" cx="215" cy="20" r="3" />
          <circle class="brand" cx="509" cy="28" r="3" />
          <path class="bg" d="M0 105H640" />
          @for (x of [112, 300, 452, 560]; track x) {
            <circle class="brand k" [attr.cx]="x" cy="97" r="7" />
          }
        }
        @case ('document') {
          <circle class="soft" cx="160" cy="124" r="100" />
          <rect class="surf k" x="76" y="24" width="150" height="192" rx="12" />
          <rect class="brand k" x="76" y="24" width="150" height="34" rx="12" />
          <rect class="brand" x="77" y="40" width="148" height="18" />
          <rect class="white" x="92" y="36" width="64" height="8" rx="4" />
          @for (y of [82, 118, 154]; track y) {
            <rect class="surf k" x="92" [attr.y]="y" width="20" height="20" rx="5" />
            <rect class="line" x="124" [attr.y]="y + 2" width="82" height="7" rx="3.5" />
            <rect class="line" x="124" [attr.y]="y + 13" width="52" height="7" rx="3.5" />
          }
          <path class="k nf" d="M97 92l5 5 8-10M97 128l5 5 8-10" />
          <rect class="surf2 k" x="92" y="186" width="118" height="14" rx="7" />
          <g class="float d2">
            <g transform="translate(236 168) rotate(40)">
              <rect class="brand k" x="-8" y="-52" width="16" height="64" rx="4" />
              <path class="surf k" d="M-8 12H8L0 30Z" />
              <path class="ink" d="M-3 24H3L0 30Z" />
              <rect class="surf k" x="-8" y="-52" width="16" height="12" rx="4" />
            </g>
          </g>
          <g class="float">
            <circle class="brand k" cx="228" cy="56" r="24" />
            <path class="kw" d="M217 56l8 8 14-16" />
          </g>
        }
        @case ('notfound') {
          <circle class="soft" cx="160" cy="124" r="100" />
          <path class="bg" d="M20 222H300" />
          <path class="k nf" d="M120 80V108H64V140" />
          <path class="k nf" d="M120 108H190V122" />
          <rect class="brand k" x="80" y="24" width="80" height="56" rx="10" />
          <circle class="surf k" cx="120" cy="43" r="7" />
          <path class="surf k" d="M106 70V65a14 11 0 0 1 28 0V70z" />
          <rect class="surf k" x="24" y="140" width="80" height="52" rx="10" />
          <circle class="soft k" cx="64" cy="157" r="7" />
          <path class="soft k" d="M51 183V179a13 11 0 0 1 26 0V183z" />
          <rect class="nf k dash" x="150" y="138" width="80" height="56" rx="10" />
          <g class="float">
            <path class="handle" d="M250 200l28 26" />
            <circle class="surf k" cx="226" cy="172" r="36" />
            <path class="k nf" d="M214 164a12 12 0 1 1 18 10c-4 2-6 4-6 9" />
            <circle class="ink" cx="226" cy="193" r="2.5" />
          </g>
        }
        @case ('success') {
          <circle class="soft" cx="160" cy="120" r="100" />
          <path class="bg" d="M20 222H300" />
          <rect
            class="surf2 k"
            x="86"
            y="56"
            width="148"
            height="148"
            rx="16"
            transform="rotate(-6 160 130)"
          />
          <rect
            class="surf k"
            x="86"
            y="56"
            width="148"
            height="148"
            rx="16"
            transform="rotate(5 160 130)"
          />
          @for (y of [150, 168]; track y) {
            <rect
              class="line"
              x="112"
              [attr.y]="y"
              [attr.width]="y === 150 ? 96 : 64"
              height="8"
              rx="4"
            />
          }
          <g class="float">
            <circle class="brand k" cx="160" cy="100" r="40" />
            <path class="kw" d="M141 100l14 14 26-30" />
          </g>
          <rect class="surf k" x="44" y="76" width="22" height="22" rx="6" />
          <circle class="brand k" cx="268" cy="70" r="9" />
          <rect class="soft k" x="262" y="150" width="20" height="20" rx="6" />
          <circle class="surf k" cx="52" cy="160" r="8" />
          <circle class="bgfill" cx="250" cy="40" r="3" />
          <circle class="bgfill" cx="70" cy="46" r="3" />
        }
        @case ('secure') {
          <rect class="surf k" x="22" y="92" width="72" height="84" rx="8" />
          <rect class="surf k" x="226" y="66" width="72" height="84" rx="8" />
          @for (y of [108, 124, 140, 156]; track y) {
            <circle class="line" cx="36" [attr.cy]="y" r="4" />
            <rect class="line" x="46" [attr.y]="y - 3" width="36" height="6" rx="3" />
          }
          @for (y of [82, 98, 114, 130]; track y) {
            <circle class="line" cx="240" [attr.cy]="y" r="4" />
            <rect class="line" x="250" [attr.y]="y - 3" width="36" height="6" rx="3" />
          }
          <g class="float">
            <path
              class="soft k"
              d="M160 26L228 52V112C228 156 198 188 160 206C122 188 92 156 92 112V52Z"
            />
            <path
              class="surf k"
              d="M160 44L212 64V112C212 146 190 172 160 188C130 172 108 146 108 112V64Z"
            />
            <path class="k nf" d="M142 108V96a18 18 0 0 1 36 0V108" />
            <rect class="brand k" x="132" y="106" width="56" height="44" rx="8" />
            <circle class="surf k" cx="160" cy="124" r="5" />
            <path class="k nf" d="M160 129V138" />
          </g>
          <path class="bg" d="M20 222H300" />
        }
      }
    </svg>
  `,
})
export class Illustration {
  protected readonly backTowers = [
    [6, 44, 52],
    [58, 32, 74],
    [118, 46, 62],
    [250, 38, 78],
    [336, 42, 58],
    [424, 32, 74],
    [504, 48, 66],
    [592, 40, 56],
  ];
  protected readonly midTowers = [
    [16, 42, 62],
    [160, 54, 82],
    [292, 40, 70],
    [380, 56, 88],
    [548, 44, 66],
  ];
  protected readonly frontTowers = [
    [76, 36, 44],
    [214, 52, 64],
    [336, 34, 40],
    [452, 50, 56],
    [596, 36, 42],
  ];

  protected rows(height: number): number[] {
    return Array.from({ length: Math.max(1, Math.floor((height - 14) / 14)) }, (_, i) => i);
  }

  readonly name = input.required<IllustrationName>();
  /** Width in px; height follows the viewBox (320x240, skyline 640x120). */
  readonly size = input(160);
  readonly tone = input<IllustrationTone>('default');
  /** Fill the container width and crop (slice) instead of scaling to `size`. */
  readonly fluid = input(false);
  /** Slow 6s float on a few groups. Turned off under prefers-reduced-motion. */
  readonly animated = input(false);
  readonly decorative = input(true);
  readonly label = input('');
}
