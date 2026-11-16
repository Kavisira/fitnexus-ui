import { FormGroup } from '@angular/forms';
import {
  Employee,
  EmployeePayload,
  SalaryComponent,
  UpdateEmployeePayload,
} from '../../../../../core/employees/employee-api.service';

export function calculateNetPay(basicPay: number | null | undefined, components: SalaryComponent[]): number {
  const base = Number(basicPay ?? 0);
  let net = base;
  for (const c of components) {
    const amount = (base * Number(c.percent || 0)) / 100;
    net += c.type === 'DEDUCTION' ? -amount : amount;
  }
  return Math.round(net * 100) / 100;
}

export function toComponentsPayload(components: SalaryComponent[]): SalaryComponent[] {
  return components.map(c => ({ ...c, percent: String(c.percent) }));
}

export function stepForEmployeeControl(name: string): number {
  if (['name', 'phone', 'email', 'branchId', 'role', 'status', 'joinDate', 'dateOfBirth'].includes(name)) {
    return 0;
  }
  if (name === 'basicPay') {
    return 1;
  }
  return 2;
}

export function validateEmployeeStep(step: number, form: FormGroup, isEditing: boolean): string | null {
  if (step === 0) {
    const req = ['name', 'phone', 'branchId', 'role', 'dateOfBirth'];
    if (req.some(k => form.get(k)?.invalid)) {
      req.forEach(k => form.get(k)?.markAsTouched());
      return 'Please fill all required personal information fields.';
    }
  }
  if (step === 2 && !isEditing && form.get('createLogin')?.value && !form.get('dateOfBirth')?.value) {
    return 'Date of birth is required to generate login credentials.';
  }
  return null;
}

export function detectCredentialChanges(employee: Employee | null, form: FormGroup): string[] {
  if (!employee || !employee.user) return [];
  const raw = form.getRawValue();
  const changed: string[] = [];
  if (raw.name !== employee.name) changed.push('Name');
  const rawDob = raw.dateOfBirth ? new Date(raw.dateOfBirth).toISOString().slice(0, 10) : null;
  const oldDob = employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : null;
  if (rawDob !== oldDob) changed.push('Date of birth');
  if (raw.phone !== employee.phone) changed.push('Phone');
  return changed;
}

export function buildCreateEmployeePayload(form: FormGroup, components: SalaryComponent[]): EmployeePayload {
  const raw = form.getRawValue();
  return {
    name: String(raw.name).trim(),
    phone: String(raw.phone).trim(),
    email: raw.email ? String(raw.email).trim() : undefined,
    branchId: String(raw.branchId),
    role: raw.role,
    joinDate: new Date(raw.joinDate).toISOString(),
    dateOfBirth: raw.dateOfBirth ? new Date(raw.dateOfBirth).toISOString() : undefined,
    basicPay: raw.basicPay != null ? String(raw.basicPay) : undefined,
    createLogin: Boolean(raw.createLogin),
    components: toComponentsPayload(components),
  };
}

export function buildUpdateEmployeePayload(form: FormGroup, components: SalaryComponent[]): UpdateEmployeePayload {
  const raw = form.getRawValue();
  return {
    name: String(raw.name).trim(),
    phone: String(raw.phone).trim(),
    email: raw.email ? String(raw.email).trim() : undefined,
    branchId: String(raw.branchId),
    role: raw.role,
    status: raw.status,
    joinDate: new Date(raw.joinDate).toISOString(),
    dateOfBirth: raw.dateOfBirth ? new Date(raw.dateOfBirth).toISOString() : null,
    basicPay: raw.basicPay != null ? String(raw.basicPay) : null,
    components: toComponentsPayload(components),
    confirmCredentialRegeneration: true,
  };
}

