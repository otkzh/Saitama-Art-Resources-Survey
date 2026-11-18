export interface Publication { id: string; status: 'approved' | 'pending-contact' | 'remaining-in-review' | 'denied'; evidence: string }
export function mayPublish(record: Publication | undefined, mode: 'review' | 'release'): boolean {
  if (!record) return false;
  if (record.status === 'approved') return Boolean(record.evidence.trim());
  return mode === 'review' && record.status === 'remaining-in-review';
}
