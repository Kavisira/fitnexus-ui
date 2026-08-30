import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../core/toast/toast.service';
import { PermissionsService } from '../../../core/roles/permissions.service';
import { BranchApiService, Branch } from '../../../core/branches/branch-api.service';
import { EmployeeApiService, Employee } from '../../../core/employees/employee-api.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  AttendanceApiService,
  Holiday,
  BiometricDevice,
  BiometricEnrollment,
  UnmatchedPunch,
  BiometricVendorType,
  PunchPersonType,
  StaffCalendarDay,
  MemberCalendarDay,
  DayDetail,
  AbsentListResult,
} from '../../../core/attendance/attendance-api.service';

type AttendanceTab = 'staff' | 'members' | 'absent' | 'devices' | 'holidays';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Auto-refresh interval for "today"'s live/provisional counts while the
// Staff or Members calendar tab is open — a lightweight polling-based
// stand-in for true push updates (a WebSocket gateway would give an
// instant "logged in right now" feel; this gives a "within ~25s" feel
// with no new backend dependencies).
const LIVE_POLL_MS = 25_000;

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface CalendarCell {
  date: Date | null;
  key: string;
}

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TagModule,
    SelectModule,
    DialogModule,
    InputTextModule,
    TooltipModule,
    DatePickerModule,
    TranslatePipe,
  ],
  templateUrl: './attendance.html',
  styleUrls: ['./attendance.css'],
})
export class Attendance implements OnInit, OnDestroy {
  private attendanceApi = inject(AttendanceApiService);
  private branchApi = inject(BranchApiService);
  private employeeApi = inject(EmployeeApiService);
  private toast = inject(ToastService);
  private i18n = inject(TranslationService);
  private permissions = inject(PermissionsService);

  canWrite = computed(() => this.permissions.canWrite('ATTENDANCE'));

  activeTab = signal<AttendanceTab>('staff');
  tabs: { id: AttendanceTab; labelKey: string }[] = [
    { id: 'staff', labelKey: 'attendance.tabs.staff' },
    { id: 'members', labelKey: 'attendance.tabs.members' },
    { id: 'absent', labelKey: 'attendance.tabs.absent' },
    { id: 'devices', labelKey: 'attendance.tabs.devices' },
    { id: 'holidays', labelKey: 'attendance.tabs.holidays' },
  ];

  private livePollHandle: ReturnType<typeof setInterval> | null = null;

  selectTab(id: AttendanceTab): void {
    this.activeTab.set(id);
  }

  branches = signal<Branch[]>([]);
  employees = signal<Employee[]>([]);

  weekdayNames = WEEKDAY_NAMES;
  monthOptions = MONTH_NAMES.map((name, i) => ({ label: name, value: i + 1 }));
  yearOptions = computed(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1].map((year) => ({ label: String(year), value: year }));
  });

  now = new Date();
  calendarYear = signal(this.now.getFullYear());
  calendarMonth = signal(this.now.getMonth() + 1);
  todayKey = toDateKey(startOfDay(new Date()));

  calendarGrid = computed<CalendarCell[]>(() => {
    const year = this.calendarYear();
    const month = this.calendarMonth();
    const firstOfMonth = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const leadingBlanks = firstOfMonth.getDay();
    const cells: CalendarCell[] = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push({ date: null, key: `blank-${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      cells.push({ date, key: toDateKey(date) });
    }
    return cells;
  });

  isCurrentMonth(): boolean {
    return this.calendarYear() === this.now.getFullYear() && this.calendarMonth() === this.now.getMonth() + 1;
  }

  onPeriodChange(): void {
    this.loadStaffCalendar();
    this.loadMemberCalendar();
  }

  // ---- Staff calendar ----
  staffCalendarLoading = signal(true);
  staffCalendarByDate = signal<Record<string, StaffCalendarDay>>({});

  loadStaffCalendar(): void {
    this.staffCalendarLoading.set(true);
    this.attendanceApi.staffCalendar(this.calendarYear(), this.calendarMonth()).subscribe({
      next: (days) => {
        this.staffCalendarLoading.set(false);
        const byDate: Record<string, StaffCalendarDay> = {};
        for (const d of days) byDate[d.date.slice(0, 10)] = d;
        this.staffCalendarByDate.set(byDate);
      },
      error: () => {
        this.staffCalendarLoading.set(false);
        this.toast.error(this.i18n.t('attendance.loadError'));
      },
    });
  }

  // ---- Member calendar ----
  memberCalendarLoading = signal(true);
  memberCalendarByDate = signal<Record<string, number>>({});

  loadMemberCalendar(): void {
    this.memberCalendarLoading.set(true);
    this.attendanceApi.memberCalendar(this.calendarYear(), this.calendarMonth()).subscribe({
      next: (days) => {
        this.memberCalendarLoading.set(false);
        const byDate: Record<string, number> = {};
        for (const d of days) byDate[d.date.slice(0, 10)] = d.count;
        this.memberCalendarByDate.set(byDate);
      },
      error: () => {
        this.memberCalendarLoading.set(false);
        this.toast.error(this.i18n.t('attendance.loadError'));
      },
    });
  }

  // ---- Day detail dialog (shared by Staff + Members calendars) ----
  dayDetailVisible = signal(false);
  dayDetailLoading = signal(false);
  dayDetail = signal<DayDetail | null>(null);
  dayDetailMode = signal<'staff' | 'members'>('staff');

  openDayDetail(cell: CalendarCell, mode: 'staff' | 'members'): void {
    if (!cell.date) return;
    this.dayDetailMode.set(mode);
    this.dayDetailVisible.set(true);
    this.dayDetailLoading.set(true);
    this.attendanceApi.dayDetail(cell.key).subscribe({
      next: (detail) => {
        this.dayDetailLoading.set(false);
        this.dayDetail.set(detail);
      },
      error: () => {
        this.dayDetailLoading.set(false);
        this.toast.error(this.i18n.t('attendance.loadError'));
      },
    });
  }

  closeDayDetail(): void {
    this.dayDetailVisible.set(false);
    this.dayDetail.set(null);
  }

  // ---- Absent tab ----
  absentDate = signal<Date>((() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return startOfDay(yesterday);
  })());
  absentLoading = signal(true);
  absentResult = signal<AbsentListResult | null>(null);

  loadAbsent(): void {
    this.absentLoading.set(true);
    this.attendanceApi.absentList(toDateKey(this.absentDate())).subscribe({
      next: (result) => {
        this.absentLoading.set(false);
        this.absentResult.set(result);
      },
      error: () => {
        this.absentLoading.set(false);
        this.toast.error(this.i18n.t('attendance.loadError'));
      },
    });
  }

  onAbsentDateChange(date: Date): void {
    this.absentDate.set(startOfDay(date));
    this.loadAbsent();
  }

  // ---- Devices ----
  devicesLoading = signal(true);
  devices = signal<BiometricDevice[]>([]);
  unmatchedPunches = signal<UnmatchedPunch[]>([]);

  vendorOptions: { label: string; value: BiometricVendorType }[] = [
    { label: 'ZKTeco / eSSL / ADMS-compatible device (recommended)', value: 'ADMS_PUSH' },
    { label: 'Generic webhook (custom bridge/app)', value: 'GENERIC_WEBHOOK' },
    { label: 'CSV import only', value: 'CSV_IMPORT' },
  ];

  deviceDialogVisible = signal(false);
  newDeviceName = signal('');
  newDeviceBranchId = signal<string | null>(null);
  newDeviceVendorType = signal<BiometricVendorType>('ADMS_PUSH');
  newDeviceSerial = signal('');
  savingDevice = signal(false);

  apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
  webhookBase = `${API_BASE_URL}/attendance/ingest/webhook`;

  loadDevices(): void {
    this.devicesLoading.set(true);
    this.attendanceApi.listDevices().subscribe({
      next: (devices) => {
        this.devicesLoading.set(false);
        this.devices.set(devices);
      },
      error: () => {
        this.devicesLoading.set(false);
        this.toast.error(this.i18n.t('attendance.loadError'));
      },
    });
  }

  loadUnmatched(): void {
    this.attendanceApi.unmatchedPunches().subscribe({
      next: (punches) => this.unmatchedPunches.set(punches),
      error: () => {},
    });
  }

  openDeviceDialog(): void {
    this.newDeviceName.set('');
    this.newDeviceBranchId.set(this.branches()[0]?.id ?? null);
    this.newDeviceVendorType.set('ADMS_PUSH');
    this.newDeviceSerial.set('');
    this.deviceDialogVisible.set(true);
  }

  closeDeviceDialog(): void {
    this.deviceDialogVisible.set(false);
  }

  saveDevice(): void {
    const branchId = this.newDeviceBranchId();
    const name = this.newDeviceName().trim();
    if (!branchId || !name) {
      this.toast.error(this.i18n.t('attendance.devices.validationError'));
      return;
    }
    if (this.newDeviceVendorType() === 'ADMS_PUSH' && !this.newDeviceSerial().trim()) {
      this.toast.error(this.i18n.t('attendance.devices.serialRequiredError'));
      return;
    }
    this.savingDevice.set(true);
    this.attendanceApi
      .createDevice({
        branchId,
        name,
        vendorType: this.newDeviceVendorType(),
        serialNumber: this.newDeviceVendorType() === 'ADMS_PUSH' ? this.newDeviceSerial().trim() : undefined,
      })
      .subscribe({
        next: () => {
          this.savingDevice.set(false);
          this.deviceDialogVisible.set(false);
          this.toast.success(this.i18n.t('attendance.devices.createSuccess'));
          this.loadDevices();
        },
        error: (err) => {
          this.savingDevice.set(false);
          this.toast.error(err?.error?.message ?? this.i18n.t('attendance.devices.createError'));
        },
      });
  }

  removeDevice(device: BiometricDevice): void {
    this.attendanceApi.removeDevice(device.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('attendance.devices.removeSuccess'));
        this.loadDevices();
        if (this.enrollmentDeviceId() === device.id) this.closeEnrollments();
      },
      error: () => this.toast.error(this.i18n.t('attendance.devices.removeError')),
    });
  }

  rotateKey(device: BiometricDevice): void {
    this.attendanceApi.rotateKey(device.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('attendance.devices.rotateSuccess'));
        this.loadDevices();
      },
      error: () => this.toast.error(this.i18n.t('attendance.devices.rotateError')),
    });
  }

  // ---- Enrollments ----
  enrollmentDeviceId = signal<string | null>(null);
  enrollments = signal<BiometricEnrollment[]>([]);
  enrollmentsLoading = signal(false);

  newEnrollmentBioId = signal('');
  newEnrollmentPersonType = signal<PunchPersonType>('EMPLOYEE');
  newEnrollmentEmployeeId = signal<string | null>(null);
  newEnrollmentMemberId = signal('');
  savingEnrollment = signal(false);

  personTypeOptions: { label: string; value: PunchPersonType }[] = [
    { label: 'Employee', value: 'EMPLOYEE' },
    { label: 'Member', value: 'MEMBER' },
  ];

  manageEnrollments(device: BiometricDevice): void {
    this.enrollmentDeviceId.set(device.id);
    this.enrollmentsLoading.set(true);
    this.newEnrollmentBioId.set('');
    this.newEnrollmentPersonType.set('EMPLOYEE');
    this.newEnrollmentEmployeeId.set(this.employees()[0]?.id ?? null);
    this.newEnrollmentMemberId.set('');
    this.attendanceApi.listEnrollments(device.id).subscribe({
      next: (rows) => {
        this.enrollmentsLoading.set(false);
        this.enrollments.set(rows);
      },
      error: () => {
        this.enrollmentsLoading.set(false);
        this.toast.error(this.i18n.t('attendance.loadError'));
      },
    });
  }

  closeEnrollments(): void {
    this.enrollmentDeviceId.set(null);
    this.enrollments.set([]);
  }

  addEnrollment(): void {
    const deviceId = this.enrollmentDeviceId();
    const bioId = this.newEnrollmentBioId().trim();
    if (!deviceId || !bioId) {
      this.toast.error(this.i18n.t('attendance.devices.validationError'));
      return;
    }
    const personType = this.newEnrollmentPersonType();
    if (personType === 'EMPLOYEE' && !this.newEnrollmentEmployeeId()) {
      this.toast.error(this.i18n.t('attendance.devices.validationError'));
      return;
    }
    if (personType === 'MEMBER' && !this.newEnrollmentMemberId().trim()) {
      this.toast.error(this.i18n.t('attendance.devices.validationError'));
      return;
    }
    this.savingEnrollment.set(true);
    this.attendanceApi
      .upsertEnrollment(deviceId, {
        biometricUserId: bioId,
        personType,
        employeeId: personType === 'EMPLOYEE' ? this.newEnrollmentEmployeeId()! : undefined,
        memberId: personType === 'MEMBER' ? this.newEnrollmentMemberId().trim() : undefined,
      })
      .subscribe({
        next: () => {
          this.savingEnrollment.set(false);
          this.toast.success(this.i18n.t('attendance.devices.enrollSuccess'));
          this.manageEnrollments({ id: deviceId } as BiometricDevice);
          this.loadUnmatched();
        },
        error: (err) => {
          this.savingEnrollment.set(false);
          this.toast.error(err?.error?.message ?? this.i18n.t('attendance.devices.enrollError'));
        },
      });
  }

  removeEnrollment(enrollment: BiometricEnrollment): void {
    const deviceId = this.enrollmentDeviceId();
    if (!deviceId) return;
    this.attendanceApi.removeEnrollment(deviceId, enrollment.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('attendance.devices.enrollRemoveSuccess'));
        this.manageEnrollments({ id: deviceId } as BiometricDevice);
      },
      error: () => this.toast.error(this.i18n.t('attendance.devices.enrollRemoveError')),
    });
  }

  // ---- Holidays ----
  holidaysLoading = signal(true);
  holidays = signal<Holiday[]>([]);
  newHolidayDate = signal<Date | null>(null);
  newHolidayName = signal('');
  savingHoliday = signal(false);

  loadHolidays(): void {
    this.holidaysLoading.set(true);
    this.attendanceApi.listHolidays().subscribe({
      next: (rows) => {
        this.holidaysLoading.set(false);
        this.holidays.set(rows);
      },
      error: () => {
        this.holidaysLoading.set(false);
        this.toast.error(this.i18n.t('attendance.loadError'));
      },
    });
  }

  addHoliday(): void {
    const date = this.newHolidayDate();
    const name = this.newHolidayName().trim();
    if (!date || !name) {
      this.toast.error(this.i18n.t('attendance.devices.validationError'));
      return;
    }
    this.savingHoliday.set(true);
    this.attendanceApi.createHoliday({ date: toDateKey(date), name }).subscribe({
      next: () => {
        this.savingHoliday.set(false);
        this.newHolidayDate.set(null);
        this.newHolidayName.set('');
        this.toast.success(this.i18n.t('attendance.holidays.addSuccess'));
        this.loadHolidays();
      },
      error: () => {
        this.savingHoliday.set(false);
        this.toast.error(this.i18n.t('attendance.holidays.addError'));
      },
    });
  }

  removeHoliday(holiday: Holiday): void {
    this.attendanceApi.removeHoliday(holiday.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('attendance.holidays.removeSuccess'));
        this.loadHolidays();
      },
      error: () => this.toast.error(this.i18n.t('attendance.holidays.removeError')),
    });
  }

  // ---- Shared ----
  ngOnInit(): void {
    this.branchApi.list().subscribe({ next: (branches) => this.branches.set(branches), error: () => {} });
    this.employeeApi.list().subscribe({ next: (employees) => this.employees.set(employees), error: () => {} });
    this.loadStaffCalendar();
    this.loadMemberCalendar();
    this.loadAbsent();
    this.loadDevices();
    this.loadUnmatched();
    this.loadHolidays();

    // Polling-based "live" refresh: only worth doing while looking at
    // the current month, since past months never change.
    this.livePollHandle = setInterval(() => {
      if (!this.isCurrentMonth()) return;
      if (this.activeTab() === 'staff') this.loadStaffCalendar();
      if (this.activeTab() === 'members') this.loadMemberCalendar();
    }, LIVE_POLL_MS);
  }

  ngOnDestroy(): void {
    if (this.livePollHandle) clearInterval(this.livePollHandle);
  }

  statusSeverity(status: string): 'success' | 'danger' | 'warn' | 'secondary' | 'info' {
    switch (status) {
      case 'PRESENT':
        return 'success';
      case 'ABSENT':
        return 'danger';
      case 'HALF_DAY':
        return 'warn';
      case 'ON_LEAVE':
        return 'info';
      default:
        return 'secondary';
    }
  }
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
