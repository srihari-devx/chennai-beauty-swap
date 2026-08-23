# Swaptics Accessibility (a11y) QA & Regression Checklist

**Finding 14 Remediation:** Standardizing accessibility validation (WCAG 2.1 AA) across core user journeys, dialogs, and administrative workflows.

---

## 1. Automated Accessibility Verification

### CI Lint Checks
- Form inputs must include explicit or implicit `<Label>` associators (`htmlFor` / `id`).
- All interactive `<button>` elements must have discernible text or `aria-label`.
- All `<img>` tags must include meaningful `alt` attributes or `alt=""` for decorative assets.
- Color contrast ratios must meet minimum 4.5:1 for normal text and 3:1 for large text across light and dark modes.

---

## 2. Keyboard Navigation QA Protocol (Manual Regression)

Verify that the entire platform is operable without a mouse:

| Checkpoint | Target Behavior | Verified |
|------------|-----------------|----------|
| **Focus Indicator** | Visible focus rings (`ring-2 ring-primary`) appear on all interactive components when using <kbd>Tab</kbd>. | [ ] |
| **Tab Order** | Follows logical top-to-bottom, left-to-right reading order across all grid layouts. | [ ] |
| **Modal / Dialog Focus Traps** | Opening dialogs (Delete confirmations, Product report, Filters sheet) traps focus inside the modal; pressing <kbd>Escape</kbd> closes the dialog and returns focus to the trigger. | [ ] |
| **Dropdown Menus & Carousels** | Operable using <kbd>Enter</kbd>, <kbd>Space</kbd>, and <kbd>Arrow</kbd> keys. | [ ] |
| **Form Submissions** | Pressing <kbd>Enter</kbd> inside text inputs cleanly triggers form submission without page reload. | [ ] |

---

## 3. Screen Reader Verification (NVDA / VoiceOver)

1. **Live Regions & Toasts**:
   - `sonner` notifications announce success/error states to screen readers automatically using `role="status"` and `aria-live="polite"`.
2. **Dynamic Badges**:
   - Condition badges (`Sealed`, `Lightly Used`) announce condition semantics cleanly.
   - Verified seller badge announced with descriptive text rather than plain icon glyph.
3. **Empty States & Loading**:
   - Spinners include accessible fallback text or `aria-busy="true"`.
   - Empty lists ("No chats yet", "No products found") announced clearly.

---

## 4. Admin Workflow Accessibility Checklist

- **Pagination Controls**: Previous/Next buttons include discernible text and `aria-disabled` / `disabled` states when on boundary pages.
- **Destructive Actions**: Delete buttons announce user name / product title rather than generic "Delete".
- **Tabs Component**: Admin sub-navigation uses ARIA tab patterns with active state announcements.
