# Next Step on Next.js

Browser SDK

## Requirements

- Next.js App Router with a client component.

## 1. Install the React package

Download and install the bundled React tarball in your Next.js project.

File: Terminal

```
npm install ./before-react.tgz
```

## 2. Create a client provider

The SDK uses browser APIs. Keep the provider in a client component and mount it once from the root layout.

File: app/next-step-provider.tsx

```
'use client';
import { BeforeProvider } from '@before/react';
import type { ReactNode } from 'react';

export function NextStepProvider({ children }: { children: ReactNode }) {
  return <BeforeProvider endpoint="https://support.example" siteId="YOUR_INSTALLATION_ID">
    {children}
  </BeforeProvider>;
}
```

## 3. Use it in the app layout

Wrap children in the provider. In the client component that handles moderation, use useBefore().intervene when your existing decision requires it.

File: app/layout.tsx

```
import { NextStepProvider } from './next-step-provider';

export default function RootLayout({ children }) {
  return <html lang="en"><body>
    <NextStepProvider>{children}</NextStepProvider>
  </body></html>;
}
```

## Integration scope

The browser SDK displays the intervention. Your existing moderation system supplies the decision; this guide does not install a production detector.

## Documentation

- [Next.js client components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
