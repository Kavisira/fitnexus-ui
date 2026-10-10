import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type FormFieldType = 'SHORT_TEXT' | 'LONG_TEXT' | 'RATING' | 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'YES_NO' | 'NUMBER' | 'DATE';

export interface FormFieldInput {
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];
  order?: number;
}

export interface FormField extends FormFieldInput {
  id: string;
}

export interface FormTemplate {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  _count?: { shareLinks: number };
}

export interface FormShareLink {
  id: string;
  token: string;
  usedAt: string | null;
  memberId: string;
  createdAt: string;
  publicUrl: string;
  qrCodeDataUrl: string;
}

export interface FormSubmission {
  id: string;
  submittedAt: string;
  answers: { id: string; formFieldId: string; textValue: string | null; numberValue: string | null; booleanValue: boolean | null; choiceValues: string[] }[];
  formShareLink: { member: { id: string; name: string; phone: string } };
}

export interface FormResultsSummary {
  totalSubmissions: number;
  fields: { fieldId: string; label: string; type: FormFieldType; average?: number; count: number; optionCounts?: Record<string, number> }[];
}

/** Thin wrapper over `/api/forms` — the custom review/feedback form
 * builder's admin side (template CRUD, link generation, results). The
 * public fill-out/submit endpoints are a separate, unauthenticated
 * service — see PublicFormApiService. */
@Injectable({ providedIn: 'root' })
export class FormApiService {
  private http = inject(HttpClient);
  private base = `${API_BASE_URL}/forms`;

  listTemplates(): Observable<FormTemplate[]> {
    return this.http.get<FormTemplate[]>(`${this.base}/templates`);
  }

  getTemplate(id: string): Observable<FormTemplate> {
    return this.http.get<FormTemplate>(`${this.base}/templates/${id}`);
  }

  createTemplate(payload: { name: string; description?: string; fields: FormFieldInput[] }): Observable<FormTemplate> {
    return this.http.post<FormTemplate>(`${this.base}/templates`, payload);
  }

  generateLink(templateId: string, memberId: string, sendWhatsapp: boolean): Observable<FormShareLink> {
    return this.http.post<FormShareLink>(`${this.base}/templates/${templateId}/links`, { memberId, sendWhatsapp });
  }

  listSubmissions(templateId: string): Observable<FormSubmission[]> {
    return this.http.get<FormSubmission[]>(`${this.base}/templates/${templateId}/submissions`);
  }

  getResults(templateId: string): Observable<FormResultsSummary> {
    return this.http.get<FormResultsSummary>(`${this.base}/templates/${templateId}/results`);
  }
}
