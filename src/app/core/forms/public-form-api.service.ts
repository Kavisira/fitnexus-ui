import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { FormFieldType } from './form-api.service';

export interface PublicFormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
}

export interface PublicForm {
  templateName: string;
  description: string | null;
  fields: PublicFormField[];
}

export interface PublicFormAnswerInput {
  formFieldId: string;
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  choiceValues?: string[];
}

/** Unauthenticated — matches the backend's PublicFormsController,
 * which has no guard at all (the token in the URL IS the access
 * control). No auth header is sent or needed here. */
@Injectable({ providedIn: 'root' })
export class PublicFormApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/public/forms`;

  getForm(token: string): Observable<PublicForm> {
    return this.http.get<PublicForm>(`${this.base}/${token}`);
  }

  submit(token: string, answers: PublicFormAnswerInput[]): Observable<unknown> {
    return this.http.post(`${this.base}/${token}/submit`, { answers });
  }
}
