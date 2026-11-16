import {
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { Chart, ChartData, ChartOptions, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-chart',
  template: `
    <div class="relative w-full" [style.height]="height()">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  host: {
    class: 'block w-full',
  },
})
export class AppChartComponent implements OnDestroy {
  readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');

  readonly type = input.required<ChartType>();
  readonly data = input.required<ChartData<ChartType, unknown, unknown>>();
  readonly options = input<ChartOptions<ChartType>>();
  readonly height = input<string>('260px');

  private chartInstance: Chart | null = null;

  constructor() {
    effect(() => {
      const canvas = this.canvasRef()?.nativeElement;
      const type = this.type();
      const data = this.data();
      const options = this.options();

      if (!canvas) return;

      if (this.chartInstance) {
        this.chartInstance.data = data as ChartData;
        if (options) {
          this.chartInstance.options = options as ChartOptions;
        }
        this.chartInstance.update();
      } else {
        this.chartInstance = new Chart(canvas, {
          type,
          data: data as ChartData,
          options: (options ?? { responsive: true, maintainAspectRatio: false }) as ChartOptions,
        });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }
}
