import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzAlertModule } from 'ng-zorro-antd/alert';

import { Branch } from '../../../../../core/branches/branch-api.service';
import {
  Employee,
  EmployeeRole,
  EmploymentStatus,
  JobTitle,
  SalaryComponent,
  SalaryComponentType,
} from '../../../../../core/employees/employee-api.service';
import {
  buildCreateEmployeePayload,
  buildUpdateEmployeePayload,
  calculateNetPay,
  detectCredentialChanges,
  stepForEmployeeControl,
  validateEmployeeStep,
} from '../services/employee-form.utils';

@Component({
  selector: 'app-employee-form-modal',
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, NzModalModule, NzButtonModule,
    NzIconModule, NzInputModule, NzSelectModule, NzDatePickerModule, NzInputNumberModule,
    NzCheckboxModule, NzAlertModule,
  ],
  templateUrl: './employee-form-modal.component.html',
})
export class EmployeeFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);

  readonly visible = input.required<boolean>();
  readonly editingEmployee = input<Employee | null>(null);
  readonly branches = input.required<Branch[]>();
  readonly jobTitles = input.required<JobTitle[]>();
  readonly saving = input<boolean>(false);
  readonly creatingLogin = input<boolean>(false);

  readonly cancel = output<void>();
  readonly save = output<{ payload: unknown; isEdit: boolean; employeeId?: string; credentialChanges?: string[] }>();
  readonly generateLogin = output<Employee>();

  readonly wizardSteps = [{ label: 'Personal' }, { label: 'Salary' }, { label: 'Login' }];
  readonly wizardStep = signal(0);
  readonly errorMessage = signal<string | null>(null);
  readonly components = signal<SalaryComponent[]>([]);

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(5)]],
    email: ['', [Validators.email]],
    branchId: ['', [Validators.required]],
    role: ['OTHER' as EmployeeRole, [Validators.required]],
    status: ['ACTIVE' as EmploymentStatus],
    joinDate: [new Date(), [Validators.required]],
    dateOfBirth: [null as Date | null, [Validators.required]],
    basicPay: [null as number | null],
    createLogin: [false],
  });

  readonly netPayPreview = computed(() => calculateNetPay(this.form.get('basicPay')?.value, this.components()));

  ngOnInit(): void {
    const emp = this.editingEmployee();
    this.wizardStep.set(0);
    this.errorMessage.set(null);
    if (emp) {
      this.form.reset({
        name: emp.name, phone: emp.phone, email: emp.email || '', branchId: emp.branchId,
        role: emp.role, status: emp.status, joinDate: new Date(emp.joinDate),
        dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth) : null,
        basicPay: emp.basicPay != null ? Number(emp.basicPay) : null, createLogin: false,
      });
      this.components.set(emp.salaryComponents ?? []);
    } else {
      this.form.reset({
        name: '', phone: '', email: '', branchId: this.branches().length === 1 ? this.branches()[0].id : '',
        role: 'OTHER', status: 'ACTIVE', joinDate: new Date(), dateOfBirth: null, basicPay: null, createLogin: false,
      });
      this.components.set([]);
    }
  }

  canJumpToStep(i: number): boolean { return Boolean(this.editingEmployee()) || i <= this.wizardStep(); }
  goToStep(i: number): void { if (this.canJumpToStep(i)) { this.errorMessage.set(null); this.wizardStep.set(i); } }

  addComponent(): void { this.components.update(l => [...l, { name: '', type: 'EARNING', percent: 0 }]); }
  removeComponent(i: number): void { this.components.update(l => l.filter((_, idx) => idx !== i)); }
  updateComponent(i: number, f: 'name' | 'type' | 'percent', v: unknown): void {
    this.components.update(l => l.map((item, idx) => idx !== i ? item : {
      ...item, [f]: f === 'percent' ? Number(v || 0) : f === 'type' ? v as SalaryComponentType : String(v || ''),
    }));
  }

  nextStep(): void {
    this.errorMessage.set(null);
    const err = validateEmployeeStep(this.wizardStep(), this.form, Boolean(this.editingEmployee()));
    if (err) { this.errorMessage.set(err); return; }
    this.wizardStep.update(s => Math.min(2, s + 1));
  }

  prevStep(): void { this.errorMessage.set(null); this.wizardStep.update(s => Math.max(0, s - 1)); }

  submit(): void {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const first = Object.keys(this.form.controls).find(k => this.form.get(k)?.invalid);
      this.wizardStep.set(first ? stepForEmployeeControl(first) : 0);
      this.errorMessage.set('Please fill all required fields correctly.');
      return;
    }
    const emp = this.editingEmployee();
    const payload = emp ? buildUpdateEmployeePayload(this.form, this.components()) : buildCreateEmployeePayload(this.form, this.components());
    const credentialChanges = emp ? detectCredentialChanges(emp, this.form) : [];
    this.save.emit({ payload, isEdit: Boolean(emp), employeeId: emp?.id, credentialChanges });
  }
}
