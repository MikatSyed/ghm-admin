'use client';

import { createPortal } from 'react-dom';

// invoice-print.css hides everything under `body.printing-receipt` except
// #print-root via `body.printing-receipt > *:not(#print-root) { display:
// none }` — that selector only matches direct children of <body>. Rendered
// inline, #print-root sits nested inside the Next.js app root instead, so
// hiding "every other body child" also hides the wrapper #print-root lives
// inside, blanking the page (display:none on an ancestor can't be undone by
// a descendant's own display value). Portalling straight onto <body> makes
// #print-root a real direct child, matching what the CSS expects.
//
// No SSR guard needed: every call site only mounts this after a client-side
// user action (a print-button click setting local state), so it never
// renders during the server pass.
export default function PrintPortal({ children }: { children: React.ReactNode }) {
  return createPortal(
    <div id="print-root" className="invoice-print-host">{children}</div>,
    document.body,
  );
}
