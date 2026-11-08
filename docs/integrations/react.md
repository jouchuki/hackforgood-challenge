# Next Step on React

React package

## Requirements

- React 18 or later and a build tool that handles JavaScript modules.

## 1. Install the package

Download the React tarball and install it from the project directory. The runtime is bundled; this is a local package, not a published npm registry name.

File: Terminal

```
npm install ./before-react.tgz
```

## 2. Mount the provider

Wrap the part of your app that handles moderation. The provider initializes in the browser and cleans up when it unmounts.

File: NextStepProvider.jsx

```
import { BeforeProvider } from '@before/react';

export function NextStepProvider({ children }) {
  return (
    <BeforeProvider endpoint="https://support.example" siteId="YOUR_INSTALLATION_ID">
      {children}
    </BeforeProvider>
  );
}
```

## 3. Use the decision callback

Call intervene after your existing moderation result says to stop. ready can be used to show an unavailable state while configuration loads.

File: Inside your React component

```
import { useBefore } from '@before/react';

const nextStep = useBefore();
async function onModerationDecision(result) {
  if (result.intervene === true && nextStep.ready) {
    await nextStep.intervene({ type: 'chat', severity: 'high' });
  }
}
```

## Integration scope

The browser SDK displays the intervention. Your existing moderation system supplies the decision; this guide does not install a production detector.

## Documentation

- [React effects and cleanup](https://react.dev/reference/react/useEffect)
