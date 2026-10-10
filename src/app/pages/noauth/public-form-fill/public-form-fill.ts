import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { RatingModule } from 'primeng/rating';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { PublicForm, PublicFormAnswerInput, PublicFormApiService, PublicFormField } from '../../../core/forms/public-form-api.service';

/** Public, unauthenticated form-fill page — the token in the URL is
 * the entire access control (see backend's PublicFormsController).
 * Not inside Layout/authGuard, same tier as /login. */
@Component({
  selector: 'app-public-form-fill',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    RatingModule,
    RadioButtonModule,
    CheckboxModule,
    DatePickerModule,
    MessageModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './public-form-fill.html',
  styleUrls: ['./public-form-fill.css'],
})
export class PublicFormFill implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(PublicFormApiService);

  loading = signal(true);
  submitting = signal(false);
  submitted = signal(false);
  errorMessage = signal<string | null>(null);
  form = signal<PublicForm | null>(null);

  // One mutable answer object per field, keyed by fieldId — simplest
  // way to two-way-bind a dynamic, unknown-at-compile-time field list
  // without a reactive FormGroup built field-by-field.
  answers: Record<string, { text?: string; number?: number; boolean?: boolean; choices?: string[]; date?: Date }> = {};

  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.errorMessage.set('This link is invalid.');
      this.loading.set(false);
      return;
    }
    this.api.getForm(this.token).subscribe({
      next: (form) => {
        this.loading.set(false);
        this.form.set(form);
        for (const field of form.fields) {
          this.answers[field.id] = field.type === 'SINGLE_CHOICE' || field.type === 'MULTI_CHOICE' ? { choices: [] } : {};
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'This link is invalid or has already been used.');
      },
    });
  }

  toggleMultiChoice(fieldId: string, option: string): void {
    const current = this.answers[fieldId].choices ?? [];
    this.answers[fieldId].choices = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
  }

  isMultiChoiceSelected(fieldId: string, option: string): boolean {
    return (this.answers[fieldId].choices ?? []).includes(option);
  }

  submit(): void {
    const form = this.form();
    if (!form) return;

    for (const field of form.fields) {
      if (!field.required) continue;
      const a = this.answers[field.id];
      const empty =
        (field.type === 'SHORT_TEXT' || field.type === 'LONG_TEXT') && !a.text?.trim()
          ? true
          : (field.type === 'RATING' || field.type === 'NUMBER') && a.number === undefined
            ? true
            : field.type === 'YES_NO' && a.boolean === undefined
              ? true
              : field.type === 'SINGLE_CHOICE' && !a.choices?.length
                ? true
                : field.type === 'MULTI_CHOICE' && !a.choices?.length
                  ? true
                  : field.type === 'DATE' && !a.date
                    ? true
                    : false;
      if (empty) {
        this.errorMessage.set(`"${field.label}" is required.`);
        return;
      }
    }

    const payload: PublicFormAnswerInput[] = form.fields.map((field) => {
      const a = this.answers[field.id];
      return {
        formFieldId: field.id,
        textValue: field.type === 'DATE' && a.date ? a.date.toISOString() : a.text,
        numberValue: a.number,
        booleanValue: a.boolean,
        choiceValues: a.choices,
      };
    });

    this.errorMessage.set(null);
    this.submitting.set(true);
    this.api.submit(this.token, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Could not submit — please try again.');
      },
    });
  }

  fieldTrackBy(_: number, field: PublicFormField): string {
    return field.id;
  }
}
