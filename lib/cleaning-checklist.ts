export const DEFAULT_CLEAN_CHECKLIST = [
  'Strip beds and start the wash',
  'Bathroom and toilet cleaned',
  'Kitchen and appliances cleaned',
  'Hoover and mop every floor',
  'Dust and wipe all surfaces',
  'Restock towels, tea and toiletries',
  'Take out the bins',
  'Check for damage or left items',
]
export type CheckItem = { text: string; done: boolean }
export const CLEAN_TABLES = ['cleaning_tasks', 'pm_cleaning_tasks', 'estate_cleaning_tasks'] as const
export const MAINT_FOR: Record<string, { table: string; props: string }> = {
  cleaning_tasks: { table: 'maintenance_tickets', props: 'properties' },
  pm_cleaning_tasks: { table: 'pm_maintenance', props: 'pm_properties' },
  estate_cleaning_tasks: { table: 'estate_maintenance', props: 'estate_properties' },
}
