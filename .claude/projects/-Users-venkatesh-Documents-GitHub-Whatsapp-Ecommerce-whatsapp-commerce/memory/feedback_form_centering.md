---
name: feedback-form-centering
description: store-admin form pages must center the form container with mx-auto
metadata:
  type: feedback
---

All form pages in store-admin must use `max-w-lg mx-auto` on the form container — not just `max-w-lg`.

**Why:** Consistent centered layout across all add/edit pages.

**How to apply:** Every `new/page.tsx` and `[id]/edit/page.tsx` in store-admin must have `<div className="max-w-lg mx-auto space-y-... pt-2">` as the form wrapper inside the scrollable container.
