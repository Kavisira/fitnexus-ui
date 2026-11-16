import {
  Component,
  ElementRef,
  forwardRef,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-otp-input',
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppOtpInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="flex items-center justify-between gap-2 sm:gap-3 w-full">
      @for (d of digits(); track $index) {
        <input
          #inputEl
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="1"
          [value]="d"
          (input)="onDigitInput($index, $event)"
          (keydown)="onKeyDown($index, $event)"
          (paste)="onPaste($event)"
          class="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
      }
    </div>
  `,
  host: {
    class: 'block w-full',
  },
})
export class AppOtpInputComponent implements ControlValueAccessor {
  readonly length = input<number>(6);
  readonly inputs = viewChildren<ElementRef<HTMLInputElement>>('inputEl');

  readonly digits = signal<string[]>(['', '', '', '', '', '']);

  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(val: string | null): void {
    const raw = String(val ?? '');
    const arr = Array.from({ length: this.length() }, (_, i) => raw[i] ?? '');
    this.digits.set(arr);
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const char = input.value.replace(/[^0-9]/g, '').slice(-1);

    const current = [...this.digits()];
    current[index] = char;
    this.digits.set(current);
    this.notify();

    if (char && index < this.length() - 1) {
      const allInputs = this.inputs();
      allInputs[index + 1]?.nativeElement.focus();
    }
  }

  onKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
      const allInputs = this.inputs();
      allInputs[index - 1]?.nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') ?? '').replace(/[^0-9]/g, '');
    if (!pasted) return;

    const current = Array.from({ length: this.length() }, (_, i) => pasted[i] ?? '');
    this.digits.set(current);
    this.notify();

    const focusIdx = Math.min(pasted.length, this.length() - 1);
    this.inputs()[focusIdx]?.nativeElement.focus();
  }

  private notify(): void {
    const val = this.digits().join('');
    this.onChange(val);
    this.onTouched();
  }
}

