import { Component, Input, OnChanges, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SpriteGender = 'MALE' | 'FEMALE' | 'OTHER' | null | undefined;

/**
 * Renders one quarter of a 4-panel exercise reference image —
 * [Male-Start | Male-End | Female-Start | Female-End], each exactly
 * 25% of the strip's width, full height — and loops between the
 * Start/End frame of the member's gender's half every ~700ms, so a
 * single static image reads like a 2-frame GIF of the rep being
 * performed.
 *
 * `gender` picks the half (MALE/OTHER defaults to the Male half,
 * FEMALE picks the Female half — see the design discussion this was
 * built from: unset/OTHER falls back to Male rather than breaking).
 * If the image fails to load at all (404, not yet uploaded in this
 * format), falls back to not rendering anything — the caller is
 * expected to have its own plain-image fallback alongside this
 * component for exercises whose image isn't in the 4-panel format.
 */
@Component({
  selector: 'app-exercise-sprite',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exercise-sprite.html',
  styleUrls: ['./exercise-sprite.css'],
})
export class ExerciseSprite implements OnChanges, OnDestroy {
  @Input() imageUrl: string | null = null;
  @Input() gender: SpriteGender = null;
  @Input() alt = '';

  /** 0 = Start frame, 1 = End frame within the chosen gender's half. */
  frame = signal<0 | 1>(0);
  failed = signal(false);

  private intervalId?: ReturnType<typeof setInterval>;

  ngOnChanges(): void {
    this.failed.set(false);
    this.frame.set(0);
    this.restartLoop();
  }

  ngOnDestroy(): void {
    this.stopLoop();
  }

  private restartLoop(): void {
    this.stopLoop();
    if (!this.imageUrl) {
      return;
    }
    this.intervalId = setInterval(() => {
      this.frame.update((f) => (f === 0 ? 1 : 0));
    }, 700);
  }

  private stopLoop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /** Fixed panel offset (as a % of the img's own 400%-wide box, so
   * 25% = one panel) for the Start frame of the member's gender half:
   * 0=Male-Start, 50=Female-Start. The End frame is always the next
   * panel over (+25). Both frames stay mounted, stacked, and only
   * their opacity crossfades — nothing ever slides. */
  startOffset(): number {
    return this.gender === 'FEMALE' ? 50 : 0;
  }

  endOffset(): number {
    return this.startOffset() + 25;
  }

  onImageError(): void {
    this.failed.set(true);
  }
}
