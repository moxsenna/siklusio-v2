import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.

          <ScrollViewStyleReset />
        */}

        {/* Inline CSS so background never flickers, and so the app stretches full height on web. */}
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

/**
 * Web-only global CSS.
 *
 * - html / body / #root: full-height + reset, supaya React Native Web ScrollView
 *   yang pakai flex:1 tidak collapse ke 0px.
 * - On wide screens (>= 600px) we render the app as a centered "phone frame"
 *   with a soft pink-teal gradient backdrop, replicating the mobile look the
 *   designer intended. The `.expo-app` selector matches the root view that
 *   expo-router renders.
 */
const globalCss = `
@font-face {
  font-family: 'FontAwesome';
  src: url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.ttf') format('truetype');
}
html, body {
  margin: 0;
  padding: 0;
  background-color: #fdf2f8;
  color: #1e1b20;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  height: 100%;
  height: 100dvh;
  min-height: 100%;
  min-height: 100dvh;
}
#root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  height: 100dvh;
  min-height: 100vh;
  min-height: 100dvh;
}

/* Desktop: pakai phone-frame look */
@media (min-width: 600px) {
  body:not(.admin-page-fullwidth) {
    background: linear-gradient(135deg, #fce7f3 0%, #ccfbf1 100%);
  }
  body:not(.admin-page-fullwidth) #root {
    align-items: center;
    justify-content: center;
  }
  /* Anak langsung dari #root = wrapper yang dibuat expo-router untuk Stack */
  body:not(.admin-page-fullwidth) #root > div {
    width: 100%;
    max-width: 520px;
    height: 100vh;
    height: 100dvh;
    background: #fdf2f8;
    box-shadow: 0 20px 60px -10px rgba(236, 72, 153, 0.25),
                0 8px 24px -8px rgba(20, 184, 166, 0.15);
    overflow: hidden;
    border-left: 1px solid rgba(251, 207, 232, 0.6);
    border-right: 1px solid rgba(251, 207, 232, 0.6);
  }
}
`;
