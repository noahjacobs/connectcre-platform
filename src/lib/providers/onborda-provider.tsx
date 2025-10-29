'use client';

import { OnbordaProvider as BaseOnbordaProvider } from 'onborda';

export function OnbordaProvider({ children }: { children: React.ReactNode }) {
  const steps: any[] = [];

  return (
    <BaseOnbordaProvider>
      {children}
    </BaseOnbordaProvider>
  );
}
