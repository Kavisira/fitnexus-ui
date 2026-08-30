// Static, hand-written help content for every screen in FitNexus. Kept
// as plain English (not run through the i18n pipeline) since this is
// reference documentation rather than UI chrome — the volume of text
// here would be a heavy translation burden for little benefit, and
// admins/owners reading a "how do I..." guide overwhelmingly read it
// in whichever language they're comfortable troubleshooting in.

export interface HelpStep {
  text: string;
}

export interface HelpFaq {
  q: string;
  a: string;
}

export interface HelpSection {
  id: string;
  icon: string; // PrimeNG pi- icon suffix
  title: string;
  summary: string; // one-line, shown in the nav list
  whoCanSee: string; // plain-English permission note
  overview: string[]; // paragraphs
  steps?: { title: string; items: HelpStep[] }[];
  tips?: string[];
  faqs?: HelpFaq[];
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'dashboard',
    icon: 'home',
    title: 'Dashboard',
    summary: 'Your daily snapshot — different for owners/managers vs. staff.',
    whoCanSee: 'Every logged-in user always has access — it is not part of the Roles & Permissions matrix.',
    overview: [
      'The Dashboard is the first screen you land on after signing in. What it shows depends on your role.',
      'Owners and Branch Managers see the "analytics" view: an organization overview banner (branch count, staff, active members, lead conversion), member sign-up trends, revenue vs. expenses vs. net profit, revenue by plan, expenses by category, the leads pipeline, and — when you are looking at the whole organization rather than one branch — a per-branch performance table.',
      'Trainers and Front Desk staff see the "operations" view instead: today\'s check-ins, members flagged by their latest BMI reading (underweight/obese), memberships expiring soon, and their assigned follow-ups. No revenue or expense figures are shown to this role group.',
    ],
    steps: [
      {
        title: 'Reading the charts',
        items: [
          { text: 'Every chart card has an expand icon in its header — click it to open that chart full-size in a pop-up for a closer look.' },
          { text: 'If your organization has more than one branch, a branch dropdown appears next to the page title. Pick a branch to filter every stat and chart to just that branch, or leave it on "All branches" for the org-wide view (this also brings back the per-branch table, which only makes sense when nothing is filtered).' },
        ],
      },
    ],
    tips: [
      'The per-branch breakdown table only appears when you are viewing all branches together — pick a single branch and it disappears, since a one-row table would be redundant.',
      'Charts automatically switch their color scheme when you toggle dark mode from the header.',
    ],
  },
  {
    id: 'branches',
    icon: 'building',
    title: 'Branches',
    summary: 'Create and manage each physical gym location under your organization.',
    whoCanSee: 'Governed by the BRANCHES permission. View needs read access; add/edit/delete need write access.',
    overview: [
      'A "branch" is one physical gym location belonging to your organization. Every member, employee, plan enrollment, expense and check-in is tied to a branch (except an Owner, who is not pinned to any single branch and can see/switch between all of them).',
      'This is usually the first screen a new organization sets up, since almost everything else — employees, members, expenses — needs a branch to belong to.',
    ],
    steps: [
      {
        title: 'How to create a branch',
        items: [
          { text: 'Go to Branches in the left sidebar.' },
          { text: 'Click "Add Branch" (top right).' },
          { text: 'Fill in the branch name, address, and contact details in the dialog.' },
          { text: 'Save. The new branch immediately becomes available as an option everywhere a branch is picked — employee creation, member sign-up, expenses, the dashboard branch filter, and so on.' },
        ],
      },
      {
        title: 'Editing or deactivating a branch',
        items: [
          { text: 'Click the row (or its edit icon) to open the same dialog pre-filled with its current details.' },
          { text: 'A branch can be marked inactive rather than deleted outright if it has historical data (members, expenses, attendance) attached to it — this keeps records intact while hiding it from new sign-ups and dropdowns.' },
        ],
      },
    ],
    tips: [
      'Branch Managers, Trainers and Front Desk staff are each tied to exactly one branch at login time — they never see a branch switcher, only their own location\'s data.',
      'Only the Owner role can see and compare data across all branches at once (the Dashboard\'s per-branch table, for example).',
    ],
  },
  {
    id: 'plans',
    icon: 'tags',
    title: 'Plans & Packages',
    summary: 'The membership packages you sell — pricing, duration, and what\'s included.',
    whoCanSee: 'Governed by the PLANS permission (this also controls Offers — see below).',
    overview: [
      'A "plan" is a sellable membership package — for example "1 Month Basic", "3 Month Gold", "Annual Unlimited" — with its own price, duration, and description. Plans are what you assign to a member when they sign up or renew.',
      'Plans can be branch-specific or organization-wide depending on how your pricing is structured.',
    ],
    steps: [
      {
        title: 'How to create a plan',
        items: [
          { text: 'Go to "Plans & Packages" in the sidebar.' },
          { text: 'Click "Add Plan".' },
          { text: 'Enter the plan name, price, duration (in months/days), and any description of what\'s included.' },
          { text: 'Save — the plan is now selectable whenever a member is enrolled or renewed.' },
        ],
      },
    ],
    tips: [
      'Editing a plan\'s price only affects future sign-ups/renewals — it does not retroactively change what existing members are already paying.',
    ],
  },
  {
    id: 'offers',
    icon: 'percentage',
    title: 'Offers',
    summary: 'Discounts and promos (percentage off, flat amount off, extra free months, couple offers) applied on top of a plan.',
    whoCanSee: 'Governed by the PLANS permission — Offers is intentionally not a separate row in Roles & Permissions; anyone who can manage Plans can also manage Offers.',
    overview: [
      'Offers are an independent, org-wide catalog of discounts/promos — not tied to any one branch or plan. A "10% off" or "1 month free" offer defined here can be applied against any plan at any branch when a member signs up or renews.',
      'There are four offer types: a percentage discount, a flat amount discount, extra free duration (bonus months added on), and a "couple offer" that discounts a second member signing up alongside the first (up to and including 100% off, i.e. fully free).',
    ],
    steps: [
      {
        title: 'How to create an offer',
        items: [
          { text: 'Go to Offers in the sidebar (you will only see this link if you also have access to Plans).' },
          { text: 'Click "Add Offer", give it a name, and pick its type.' },
          { text: 'Depending on the type, fill in the percentage, flat amount, or number of extra months.' },
          { text: 'Toggle it active/inactive — inactive offers stay in the list for reference but can\'t be applied to new sign-ups.' },
        ],
      },
    ],
    tips: [
      'A flat-amount discount has no currency of its own — it is charged in whichever currency the branch/plan it gets applied against uses.',
      'If you don\'t see "Offers" in the sidebar even though you can see "Plans & Packages", check with your Owner — the two are always granted together.',
    ],
  },
  {
    id: 'members',
    icon: 'users',
    title: 'Members',
    summary: 'Your gym members — sign-up, plan assignment, check-ins, and progress photos.',
    whoCanSee: 'Governed by the MEMBERS permission.',
    overview: [
      'This is the core roster of everyone who has joined the gym: contact details, which branch and plan they\'re on, membership status (active/expiring/expired), and their health/progress tracking over time.',
      'Each member has a detail view with a full history: BMI/weight tracking with monthly review photos, and (if enabled) plan renewal history.',
    ],
    steps: [
      {
        title: 'Signing up a new member',
        items: [
          { text: 'Go to Members and click "Add Member".' },
          { text: 'Fill in personal details, pick their branch and plan, and apply an offer if one is running.' },
          { text: 'Save. The member is now active and appears in Dashboard counts and check-in flows.' },
        ],
      },
      {
        title: 'Logging a monthly check-in / progress review',
        items: [
          { text: 'Open a member\'s detail page and use "Log check-in".' },
          { text: 'Enter their current weight and, optionally, chest/waist/hip measurements, plus a progress photo.' },
          { text: 'Each check-in is automatically labeled in order — "1st Review", "2nd Review", and so on — so the history reads chronologically at a glance.' },
          { text: 'The history table shows weight/BMI change since the previous review with up/down arrows (green = improving toward goal, red = the opposite), and you can open the full-size photo compare view to see every review side by side.' },
        ],
      },
    ],
    tips: [
      'Progress photos are compressed automatically on upload to keep storage costs down without a visible quality loss.',
      'The "Log check-in" button is a write action — Front Desk/Trainer roles need write access on Members to see it, not just read access.',
    ],
  },
  {
    id: 'expenses',
    icon: 'wallet',
    title: 'Expenses',
    summary: 'Track gym running costs — rent, salary, utilities, equipment, and more — by branch and category.',
    whoCanSee: 'Governed by the EXPENSES permission.',
    overview: [
      'Expenses records what the gym spends, so the Dashboard can show a true net-profit figure (revenue minus expenses), not just revenue.',
      'Every expense has a category (Rent, Salary, Utilities, Equipment, Maintenance, Marketing, or Other), an amount, a date, an optional note, and a branch it belongs to.',
      'The page includes two charts: a doughnut chart of spending by category, and a bar chart of the last 6 months\' trend — both respect whatever filters you have applied (except the trend chart, which always covers a fixed 6-month window).',
    ],
    steps: [
      {
        title: 'Recording an expense',
        items: [
          { text: 'Go to Expenses and click "Add Expense".' },
          { text: 'Pick a category, enter the amount and date, and add a note if useful (e.g. "March electricity bill").' },
          { text: 'Save. It immediately factors into that branch\'s net-profit figure on the Dashboard.' },
        ],
      },
      {
        title: 'Filtering the list',
        items: [
          { text: 'Use the branch, category, and date-range filters above the table to narrow down what you\'re looking at — useful for reconciling a specific month or category.' },
        ],
      },
    ],
    tips: [
      'Staff logged in under a specific branch only ever see and record expenses for their own branch — the branch filter is hidden for them since there\'s nothing else to choose from.',
    ],
  },
  {
    id: 'employees',
    icon: 'id-card',
    title: 'Employees',
    summary: 'Staff accounts — trainers, front desk, branch managers — with roles and branch assignment.',
    whoCanSee: 'Governed by the EMPLOYEES permission.',
    overview: [
      'This is where you add staff members and assign them a role (Branch Manager, Trainer, Front Desk) and a home branch. Their role determines what they can see and do everywhere else in the app, via the Roles & Permissions matrix.',
      'An employee\'s status (active/inactive) controls whether they can currently log in and whether they count toward the Dashboard\'s active-staff figures.',
    ],
    steps: [
      {
        title: 'Adding a staff member',
        items: [
          { text: 'Go to Employees and click "Add Employee".' },
          { text: 'Fill in their name, contact details, and pick their branch and role.' },
          { text: 'Save — they can now sign in (via whatever login flow your organization uses) and will see the screens their role has read access to.' },
        ],
      },
    ],
    tips: [
      'Changing an employee\'s role takes effect the next time their permission matrix is loaded — usually their next page load or login.',
      'The Owner role itself is not managed here — there is exactly one Owner per organization, set up at signup.',
    ],
  },
  {
    id: 'leads',
    icon: 'user-plus',
    title: 'Leads',
    summary: 'Prospective members — inquiries, trial visits, and follow-ups — before they convert to a paying member.',
    whoCanSee: 'Governed by the LEADS permission.',
    overview: [
      'A "lead" is anyone who has shown interest but hasn\'t signed up yet — a walk-in inquiry, a phone call, a social media message. Leads move through a pipeline of statuses until they either convert into a member or go cold.',
      'Each lead can be assigned to a staff member and given a next follow-up date, which is what powers the "Follow-ups" list on the Operations dashboard for Trainers/Front Desk.',
    ],
    steps: [
      {
        title: 'Adding and progressing a lead',
        items: [
          { text: 'Go to Leads and click "Add Lead" with their contact details and how they found you.' },
          { text: 'Assign it to a staff member and set a follow-up date.' },
          { text: 'As you talk to them, update their status (e.g. Contacted → Trial Scheduled → Converted, or Lost if they don\'t proceed).' },
          { text: 'Converting a lead typically means creating them as a full Member from the Members screen, referencing the same contact details.' },
        ],
      },
    ],
    tips: [
      'The Dashboard\'s "lead conversion" figure is simply converted leads divided by total leads over the tracked window — keeping lead statuses up to date keeps that number meaningful.',
    ],
  },
  {
    id: 'attendance',
    icon: 'calendar-clock',
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
    icon: 'calendar-clock',
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
    icon: 'id-card',
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
    icon: 'shield',
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
