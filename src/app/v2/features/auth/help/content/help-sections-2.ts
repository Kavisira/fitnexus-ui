import { HelpSection } from '../help.models';

/** Help topics, part 2 of 2. Plain-English reference content (not run through i18n). */
export const HELP_SECTIONS_PART_2: HelpSection[] = [
  {
    id: 'attendance',
    icon: 'field-time',
    title: 'Attendance',
    summary: 'Biometric check-in/out tracking for staff and members, with a monthly calendar view and live status.',
    whoCanSee: 'Governed by the ATTENDANCE permission.',
    overview: [
      'Attendance is built around biometric punch devices (ZKTeco, eSSL, and other same-protocol clones) that push check-in/check-out events to FitNexus automatically — there is no manual "mark attendance" step for day-to-day use.',
      'The screen has five tabs: Staff and Members (each a monthly calendar), Absent (a day-by-day absentee list), Devices (register and monitor your biometric hardware), and Holidays (mark days that should not count toward absence).',
      'The Staff and Members calendars each show, for every day of the month, a count of how many people were present that day. Today`s cell updates live while the day is still in progress and is clearly marked "so far" until the day finishes and the count becomes final.',
    ],
    steps: [
      {
        title: 'Reading the calendar',
        items: [
          { text: 'Open the Staff or Members tab — each date in the grid shows a present-count badge if anyone punched in that day.' },
          { text: 'Click any date`s count to open a detail dialog listing every person who was present that day, along with their first check-in and last check-out time.' },
          { text: 'Use the month arrows at the top to move between months; past months always show finalized counts.' },
        ],
      },
      {
        title: 'Checking who is absent',
        items: [
          { text: 'Switch to the Absent tab and pick a date using the date picker.' },
          { text: 'A day only becomes eligible to show absentees once it has fully finished — today and future dates intentionally show nothing yet, since someone who hasn`t punched in by 2pm might still check in before closing.' },
          { text: 'Days marked as a Holiday are excluded from the absent list automatically.' },
        ],
      },
      {
        title: 'Registering a biometric device',
        items: [
          { text: 'Open the Devices tab and click "Add Device", giving it a name and picking its branch.' },
          { text: 'Point the physical device`s ADMS/iClock server settings at the URL and (for webhook-style devices) the token shown on this screen — exact steps vary by vendor but the on-screen setup instructions cover the common ZKTeco/eSSL configuration menu.' },
          { text: 'Once configured, punches from that device appear on the calendars automatically — there is nothing further to do here day-to-day, aside from checking the "unmatched punches" list if a punch can`t be matched to a known employee or member (e.g. an unenrolled fingerprint).' },
        ],
      },
      {
        title: 'Marking a holiday',
        items: [
          { text: 'Open the Holidays tab and add the date and a label (e.g. "Independence Day").' },
          { text: 'Holidays are excluded from the Absent tab`s calculations for every branch (or just the branch you pick, if branch-specific).' },
        ],
      },
    ],
    tips: [
      'Present counts refresh automatically roughly every 25 seconds while you`re viewing the current month, so you can watch check-ins arrive in near real time without reloading the page.',
      'eSSL devices use the exact same push protocol as ZKTeco (ADMS/iClock) — pick "ZKTeco/eSSL" as the device type regardless of which brand you actually own.',
    ],
  },
  {
    id: 'notifications',
    icon: 'bell',
    title: 'Notifications',
    summary: 'Configure automated alerts — e.g. membership expiry reminders — and where they get sent.',
    whoCanSee: 'Governed by the NOTIFICATIONS permission.',
    overview: [
      'This has two tabs: "Setup" (connecting a notification channel — e.g. WhatsApp/SMS/email provider credentials) and "Configuration" (which events trigger a notification and to whom — e.g. remind a member 3 days before their plan expires).',
    ],
    steps: [
      {
        title: 'Getting notifications running',
        items: [
          { text: 'Open Notifications → Setup and follow the prompts to connect your messaging provider.' },
          { text: 'Switch to the Configuration tab to choose which events send a notification and customize the message templates.' },
        ],
      },
    ],
  },
  {
    id: 'leave-management',
    icon: 'field-time',
    title: 'Leave Management',
    summary: 'Approve or reject staff leave requests and configure how many leave days each role earns.',
    whoCanSee: 'Governed by the LEAVES permission. This is the approver-facing screen; every employee applies for their own leave from the Dashboard\'s Employee Portal tab instead.',
    overview: [
      'This screen is where a Branch Manager or Owner reviews leave requests submitted by staff and decides whether to approve or reject them. It also has a configuration panel (for whoever has LEAVES write access) that sets how many days each role — Branch Manager, Trainer, Front Desk — accrues per month, split across leave types: Casual, Sick, and Earned.',
      'Applying for leave, checking your own balance, and viewing your own request history is not done here — that self-service half of leave management lives on the Dashboard\'s "Employee Portal" tab, available to any staff login (see the Employee Portal help topic).',
    ],
    steps: [
      {
        title: 'Reviewing a leave request',
        items: [
          { text: 'Open Leave Management — pending requests from your team appear at the top of the list.' },
          { text: 'Click a request to see its leave type, date range, and the reason the employee gave.' },
          { text: 'Approve or reject it — the employee sees the updated status immediately the next time they check their Employee Portal tab.' },
        ],
      },
      {
        title: 'Configuring monthly leave accrual',
        items: [
          { text: 'Open the allocation/configuration panel (visible only with LEAVES write access).' },
          { text: 'Set how many Casual, Sick, and Earned days each role earns per month.' },
          { text: 'Save — this changes how much balance future months add to each employee\'s running total; it does not retroactively rewrite balance already earned.' },
        ],
      },
    ],
    tips: [
      'A rejected request does not consume any of the employee\'s leave balance — only an approved request does.',
      'If a staff member says they can\'t see a "Leave Management" link at all, that\'s expected — only roles with LEAVES read access see it; everyone can still apply for their own leave via the Employee Portal regardless.',
    ],
  },
  {
    id: 'employee-portal',
    icon: 'idcard',
    title: 'Employee Portal',
    summary: 'Self-service leave for staff — check your balance, apply for leave, and track your own requests.',
    whoCanSee: 'Available to every staff login as a tab on the Dashboard. Hidden for the Owner account, which has no employee record to apply leave against.',
    overview: [
      'The Employee Portal is a tab on your own Dashboard (not a separate sidebar entry) where any staff member — Branch Manager, Trainer, or Front Desk — can see their current leave balance by type (Casual, Sick, Earned), apply for new leave, and track the status of requests they\'ve already submitted.',
      'This is entirely self-service and only ever shows your own data. Approving requests and setting how many days each role accrues is handled separately on the Leave Management screen by whoever has LEAVES access.',
    ],
    steps: [
      {
        title: 'Applying for leave',
        items: [
          { text: 'Go to your Dashboard and open the "Employee Portal" tab.' },
          { text: 'Click "Apply for Leave".' },
          { text: 'Pick a leave type, start date, end date, and enter a reason.' },
          { text: 'Submit — the request shows as Pending until your manager (or the Owner) approves or rejects it on the Leave Management screen.' },
        ],
      },
      {
        title: 'Checking your balance and history',
        items: [
          { text: 'The Employee Portal tab always shows your current balance for each leave type at the top.' },
          { text: 'Your request history below shows every request you\'ve made and its current status — Pending, Approved, or Rejected.' },
          { text: 'A still-pending request can usually be cancelled from this same list if you no longer need the time off.' },
        ],
      },
    ],
    tips: [
      'Balances are calculated from the monthly accrual your Owner/manager configured on the Leave Management screen — if a figure looks off, that\'s the first place to check.',
    ],
  },
  {
    id: 'alerts',
    icon: 'alert',
    title: 'Alerts',
    summary: 'Configurable login announcements — shown to users when they sign in, until dismissed or expired.',
    whoCanSee: 'Owner only for creating/managing alerts. Every logged-in user automatically sees any alert targeted to them.',
    overview: [
      'Alerts are announcements the Owner configures once, which then pop up automatically for the intended audience the next time they log in — useful for maintenance notices, policy changes, or any message that needs to reach staff reliably rather than relying on them checking a notice board.',
      'Each alert has a title and a plain-text message, a mandatory start date, and an optional end date (leave it blank for an alert with no fixed expiry). It also has an audience: everyone in the organization, everyone at one specific branch, or one specific individual user.',
      'When a user has more than one active alert queued at once, they\'re shown one at a time, in sequence — not stacked or interleaved — so each message gets read on its own.',
    ],
    steps: [
      {
        title: 'Creating an alert',
        items: [
          { text: 'Go to Alerts in the sidebar (Owner only) and click "Add Alert".' },
          { text: 'Enter a title and message, and set a start date (required) and end date (optional — leave empty for open-ended).' },
          { text: 'Choose the audience: All (everyone in the org), Branch (pick one branch), or User (pick one specific person).' },
          { text: 'Toggle it active and save — it will start appearing to the matching audience on login from the start date onward.' },
        ],
      },
      {
        title: 'What the recipient sees',
        items: [
          { text: 'On login, a matching active alert pops up in a dialog with its title and message.' },
          { text: 'A "Don\'t show again" checkbox lets the user dismiss that specific alert permanently — if left unchecked, the same alert will pop up again on every future login until it\'s dismissed or its end date passes.' },
        ],
      },
    ],
    tips: [
      'Setting an alert inactive (rather than deleting it) is a quick way to pause it without losing its content, if you want to reuse or reschedule it later.',
      'Because dismissal is per-user, a "don\'t show again" click by one person never hides the alert for anyone else it\'s targeted to.',
    ],
  },
  {
    id: 'roles-permissions',
    icon: 'safety-certificate',
    title: 'Roles & Permissions',
    summary: 'Control exactly what each role (Branch Manager, Trainer, Front Desk) can view and edit, screen by screen.',
    whoCanSee: 'Owner only — this screen configures every other permission, so only the Owner can reach it.',
    overview: [
      'This is the matrix that controls every other screen in the app. Down the left are all the screens (Members, Expenses, Leads, and so on); across the top are the non-Owner roles. For each role × screen pair you can independently toggle "View" (read access — can they open and see the screen) and "Edit" (write access — can they add/change/delete things on it).',
      'Edit access always requires View access first — a role can\'t be allowed to change something it isn\'t allowed to see, so the Edit toggle is disabled until View is turned on for that cell.',
      'The Owner role itself always has full access to everything and is not shown in this matrix — there is nothing to configure for it. Dashboard is likewise not shown here: every logged-in user always has read access to their own dashboard by design.',
      'A couple of screens are deliberately merged: turning on Plans for a role also covers Offers (they share one permission), since offers are just a feature of plan management rather than a separate module.',
    ],
    steps: [
      {
        title: 'Changing what a role can do',
        items: [
          { text: 'Go to Roles & Permissions.' },
          { text: 'Find the row for the screen you want to change (e.g. "Expenses") and the column for the role (e.g. "Trainer").' },
          { text: 'Click the eye icon to toggle View, and the pencil icon to toggle Edit — both are circular buttons that fill in blue (View) or purple (Edit) when turned on.' },
          { text: 'Once you\'ve made your changes, click "Save Changes" at the top (a "you have unsaved changes" hint appears until you do) — or "Discard" to revert.' },
        ],
      },
    ],
    tips: [
      'Changes take effect for a staff member the next time their permission cache refreshes — typically their next page load.',
      'If a staff member reports a screen "disappeared" from their sidebar, it almost always means View access was turned off for their role on that screen — check here first.',
    ],
  },
];
