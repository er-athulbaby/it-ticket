'use client';

import { useEffect, useState } from 'react';

export interface TicketStatus {
  id: number;
  label: string;
  slug: string;
  color_class: string;
  display_order: number;
  is_system: boolean;
}

export function useStatuses() {
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);

  useEffect(() => {
    fetch('/api/ticket-statuses')
      .then((r) => r.json())
      .then(setStatuses)
      .catch(() => {});
  }, []);

  return statuses;
}

export function statusLabel(slug: string, statuses: TicketStatus[]) {
  return statuses.find((s) => s.slug === slug)?.label ?? slug;
}

export function statusColor(slug: string, statuses: TicketStatus[]) {
  return statuses.find((s) => s.slug === slug)?.color_class ?? 'bg-slate-100 text-slate-600';
}
