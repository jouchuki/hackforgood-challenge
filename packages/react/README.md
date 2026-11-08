# Before React wrapper

Install the locally generated tarball. This wrapper uses the same browser adapter; it does not add detection or visitor tracking. React 18 or later is a peer dependency.

```jsx
'use client';
import { BeforeProvider, BeforeForm, useBefore } from '@before/react';

export function SearchDemo() {
  return <BeforeProvider endpoint="http://localhost:3000" siteId="demo-forum" demo>
    <BeforeForm demo action="/search">
      <label>Search <input type="search" name="q" /></label>
      <button type="submit">Search</button>
    </BeforeForm>
  </BeforeProvider>;
}
```

Only the published synthetic examples are matched in this explicit demo mode. Normal submissions remain normal. Production moderation calls `useBefore().intervene({ type: 'search', severity: 'high' })` using existing platform logic.

The provider initializes inside an effect and disposes listeners on unmount, so it is safe to render on a server and to mount/unmount during React navigation. Next.js must import the provider from a client component. A server-side import does not access a browser document or make network calls.

The runnable local example is `packages/react/example/index.html` in the source checkout.
