import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        {/* Disable body scrolling on web — makes ScrollView work like native */}
        <ScrollViewStyleReset />

        {/* Root layout + dark mode background */}
        <style dangerouslySetInnerHTML={{ __html: webStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const webStyles = `
/* Ensure full viewport coverage */
html, body, #root {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

/* Fix React Native Web flex layout */
#root {
  display: flex;
  flex-direction: column;
}

/* Dark mode background */
body {
  background-color: #000;
}
@media (prefers-color-scheme: light) {
  body {
    background-color: #fff;
  }
}

/* Suppress RN shadow warnings on web — use boxShadow instead */
* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Fix text rendering for web */
input, textarea, select {
  font-family: inherit;
}
`;
