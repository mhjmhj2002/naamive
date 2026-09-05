export const recoveryAnchor = (input: { work_item_id?: unknown; candidate_work_item_id?: unknown; execution_id?: unknown }) => {
  if (input.work_item_id) return { resource_kind: 'WORK_ITEM' as const, resource_id: String(input.work_item_id) };
  if (input.candidate_work_item_id) return { resource_kind: 'WORK_ITEM' as const, resource_id: String(input.candidate_work_item_id) };
  if (input.execution_id) return { resource_kind: 'EXECUTION' as const, resource_id: String(input.execution_id) };
  return { resource_kind: null, resource_id: null };
};
