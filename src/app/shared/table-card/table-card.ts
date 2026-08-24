import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';

/** Thin wrapper around PrimeNG's own `p-card` — the single place any
 * feature page reaches for when it needs the "card panel wrapping a
 * data table" look (Branches today; Members/Employees/Leads/Attendance
 * as those get built). Nothing here is hand-rolled UI: it's PrimeNG's
 * Card component, just pre-wired with the `app-table-card` styling hook
 * (see the shared block in styles.css) so every page gets the same
 * look automatically instead of re-declaring its own card markup/CSS.
 *
 * Usage in any feature component's template:
 *
 *   <app-table-card>
 *     <p-table styleClass="app-table" [scrollable]="true" ...>
 *       ...
 *     </p-table>
 *   </app-table-card>
 */
@Component({
  selector: 'app-table-card',
  standalone: true,
  imports: [CardModule],
  templateUrl: './table-card.html',
})
export class TableCard {}
