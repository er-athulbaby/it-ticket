'use client';

import { useEffect, useState } from 'react';

export interface AppSettings {
  company_name: string;
  ticket_prefix: string;
  ticket_counter: string;
  logo_filename: string;
  theme: string;
}

const DEFAULT: AppSettings = {
  company_name: 'HelpDesk',
  ticket_prefix: 'IT',
  ticket_counter: '0',
  logo_filename: '',
  theme: 'indigo',
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => setSettings({ ...DEFAULT, ...data }))
      .catch(() => {});
  }, []);

  return settings;
}
