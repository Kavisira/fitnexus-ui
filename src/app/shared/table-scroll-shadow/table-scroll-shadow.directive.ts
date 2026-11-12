import { Directive, ElementRef, AfterViewInit, OnDestroy, Renderer2 } from '@angular/core';

/**
 * Put on a `<p-table [scrollable]="true" ...>` to add a box-shadow under
 * the sticky header ONLY once the table body has actually been scrolled
 * — at scrollTop 0 the header should look like a normal, flat header.
 *
 * PrimeNG's own scrollable mode renders the scrolling element as a
 * child `.p-datatable-table-container` div (see its CSS: that's what
 * gets `overflow` + the sticky thead positioning), so this listens on
 * that child directly rather than trying to reproduce the scroll
 * container itself.
 */
@Directive({
  selector: '[appTableScrollShadow]',
  standalone: true,
})
export class TableScrollShadowDirective implements AfterViewInit, OnDestroy {
  private container: HTMLElement | null = null;
  private readonly onScroll = (): void => {
    if (!this.container) return;
    const scrolled = this.container.scrollTop > 0;
    if (scrolled) {
      this.renderer.addClass(this.el.nativeElement, 'scrolled-header');
    } else {
      this.renderer.removeClass(this.el.nativeElement, 'scrolled-header');
    }
  };

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
  ) {}

  ngAfterViewInit(): void {
    this.container = this.el.nativeElement.querySelector<HTMLElement>('.p-datatable-table-container');
    this.container?.addEventListener('scroll', this.onScroll, { passive: true });
  }

  ngOnDestroy(): void {
    this.container?.removeEventListener('scroll', this.onScroll);
  }
}
