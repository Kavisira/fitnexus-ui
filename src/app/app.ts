import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Root component. Toasts (NzMessageService) and confirmations (NzModalService)
 * render through NG-ZORRO's own overlay containers — see ToastService and
 * ConfirmService — so nothing global is mounted here besides the router. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class App {}
