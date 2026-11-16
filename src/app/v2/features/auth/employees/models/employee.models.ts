import { EmployeeRole, EmploymentStatus } from '../../../../../core/employees/employee-api.service';

export interface EmployeeFilterState {
  search: string;
  branchIds: string[];
  roles: EmployeeRole[];
  statuses: EmploymentStatus[];
}

export interface EmployeeSortState {
  field: 'name' | 'branch' | 'role' | 'status' | null;
  order: 1 | -1;
}

