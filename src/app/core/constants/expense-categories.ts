/** Expense categories — a fixed list (unlike payment-modes/lead-sources,
 * which are just plain free-standing strings) because each one needs an
 * icon and a translated label, same pattern as bmiStatus. Labels live
 * under the `expenses.category.*` translation keys, not here. */
export const EXPENSE_CATEGORIES = ['RENT', 'SALARY', 'UTILITIES', 'EQUIPMENT', 'MAINTENANCE', 'MARKETING', 'OTHER'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_ICON: Record<ExpenseCategory, string> = {
  RENT: 'pi-building',
  SALARY: 'pi-wallet',
  UTILITIES: 'pi-bolt',
  EQUIPMENT: 'pi-box',
  MAINTENANCE: 'pi-wrench',
  MARKETING: 'pi-megaphone',
  OTHER: 'pi-ellipsis-h',
};
