# Forms

Load when: reviewing or writing form labels, required fields, validation timing, error messaging, input types, masking, paste, login and verification-code steps, multi-step processes or submit behavior.

Each rule below names the WCAG criterion it rests on. Where WCAG does not decide, the rule says so and names the advice from `patterns` (sk-interaction-design) that is also acceptable.

## Labels

Every control needs a programmatic label: `<label for>` pointing at the input's `id`, or a wrapping `<label>` (3.3.2 Labels or Instructions, A; 4.1.2 Name, Role, Value, A). A placeholder disappears the moment the user types and usually fails contrast, so it never stands in for a label.

```html
<!-- Good: explicit association -->
<label for="email">Email</label>
<input id="email" type="email" autocomplete="email" />

<!-- Good: wrapping label, so label and control share one hit target -->
<label>
  <input type="checkbox" /> Send me updates
</label>
```

Clicking "Send me updates" toggles the checkbox, with no dead zone between them.

## Required and optional fields

WCAG requires that the user can tell which fields are required, in text and not by color alone (3.3.2, A; 1.4.1 Use of Color, A). It does not pick a convention. Whichever you use:

- Put native `required` on every required control, so assistive technology announces it whatever the visual marker.
- Keep the visible marker inside the `<label>` or `<legend>`, so it stays with its field at any zoom. Since `required` already announces the state, an asterisk may carry `aria-hidden="true"`; "(optional)" stays readable, because nothing else announces it.
- Use one convention per product.

Two conventions pass. Marking required fields with an asterisk needs a legend before the first field ("* required"). Marking optional fields with "(optional)" in the label, which `patterns` (sk-interaction-design) recommends and the GOV.UK Design System uses, suits forms where most fields are required. GOV.UK explicitly avoids asterisks: [Question pages](https://design-system.service.gov.uk/patterns/question-pages/).

## When to validate

WCAG does not set a timing. It requires that errors are identified in text (3.3.1 Error Identification, A) and that a fix is suggested where known (3.3.3 Error Suggestion, AA). The timing rule here comes from what breaks:

- **Default: validate on submit.** Focus the first invalid field, which is itself the announcement. GOV.UK: "Do not validate when the user moves away from a field. Wait until they try to move to the next part of the service" ([Validation](https://design-system.service.gov.uk/patterns/validation/)), because early errors hurt users who type slowly.
- **Never disable submit to gate validation.** A disabled button gives no reason and drops out of the tab order.
- **Acceptable, as `patterns` (sk-interaction-design) suggests:** after the first submit, re-validate each field on input or blur so errors clear as they are fixed; or validate on blur for format errors only, on a field the user has typed into. Never flag an empty required field on blur: keyboard and screen reader users often Tab through a form to learn its shape before filling it.
- **Exception worth keeping:** a live character count that warns before the limit, so nobody writes an answer that will be rejected.

## Error messaging

The complete pattern:

```html
<label for="email">Email</label>
<input
  id="email"
  type="email"
  autocomplete="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<p id="email-error">Enter an email address in the format name@example.com</p>
```

- `aria-invalid="true"` on the failing field, removed once fixed.
- `aria-describedby` links the field to its inline error so screen readers announce it with the field.
- Errors render as text beside their fields. A red border alone is a color-only cue (1.4.1) and identifies nothing (3.3.1).
- Keep what the user entered when an error occurs. Trim values before validating, because autocomplete and text expansion add trailing spaces.

Error wording belongs to `better-writing` (sk-ux-strategy).

## Masking and filtering

Never silently drop characters as the user types. With typing echo on, a screen reader can announce a key the script then discards, so the character sounds accepted while the field stays unchanged: an error never identified in text (3.3.1). `maxlength` on a formatted field does the same to a pasted `4111 1111 1111 1111`, cutting off digits without a word.

`patterns` (sk-interaction-design) recommends masking phone and card inputs. A display mask is acceptable when it:

- accepts any typed or pasted input, including spaces, dashes and brackets, and strips separators before validating;
- inserts separators without moving the caret away from where the user is typing;
- states the expected format in the label or hint (3.3.2), not only through the mask.

A mask that blocks keys or truncates paste fails those tests.

## Autocomplete and input types

A valid `autocomplete` token on each field that collects information about the user is a WCAG requirement (1.3.5 Identify Input Purpose, AA); the WCAG list includes `username`, `current-password` and `new-password`. Pair it with a descriptive `name`, a real `<form>` and no fake inputs, so password managers work. The common tokens:

| Field | `autocomplete` |
| --- | --- |
| Name | `name` (or `given-name` / `family-name`) |
| Email | `email` |
| Phone | `tel` |
| Address | `street-address`, `address-line1`, `postal-code`, `country` |
| Card | `cc-number`, `cc-exp`, `cc-csc`, `cc-name` |
| Login | `username`, `current-password` |
| Signup / reset | `username`, `new-password` |
| Verification code | `one-time-code` (an HTML token, not in the WCAG list; it lets the browser offer the code) |

Prefix with a section where relevant: `autocomplete="shipping street-address"`.

Correct `type` and `inputmode` pick the right mobile keyboard:

| Input | Use |
| --- | --- |
| Email, URL, phone | `type="email"`, `type="url"`, `type="tel"` |
| OTP / PIN / card number | `type="text" inputmode="numeric"` (keeps text semantics, no spinner) |
| Money, decimals | `type="text" inputmode="decimal"` |
| True numeric quantity | `type="number"` |

Disable spellcheck on emails, codes and usernames: `spellcheck="false"`.

## Login and verification codes

3.3.8 Accessible Authentication (Minimum), AA: no step of a login may require a cognitive function test, such as remembering a password, transcribing a code or solving a puzzle, unless the step offers an alternative method or a mechanism that helps. Password managers and copy and paste are the mechanisms the criterion names, so blocking either fails it ([Understanding 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)):

- **Never block paste** on username, password or code fields, and never block autofill with script.
- **Never ask for a reformatted secret**, such as "the 1st, 3rd and 5th characters of your password". It forces transcription.
- **Codes must be pasteable.** A verification code sent by SMS or email must accept a paste. A row of one-digit boxes passes only if pasting the full code fills them all.
- **CAPTCHA** needs a non-cognitive alternative. Recognising objects, or content the user supplied, is allowed at AA.
- Passkeys, OS biometrics, hardware keys and email magic links are not cognitive function tests.

## Redundant entry

3.3.7 Redundant Entry, A: information the user already gave in the same process is auto-populated or available to select when it is needed again: a "Billing address same as shipping" checkbox, the email from step 1 prefilled on step 3. Exceptions: re-entry that is essential (a memory game), required for security (typing a new password twice), or for information no longer valid.

A "Confirm email" field is the common trap. The Understanding document counts copying text from the page into an input as "available to select", so blocking paste into the confirm field removes the one path that could pass. Drop the confirm field, or at least allow paste.

## Submit behavior

- Keep submit enabled until the request starts. While it runs, show a spinner *beside the original label*: "Save" with a spinner, not a bare spinner. The label is what tells assistive tech which button is busy.
- Mark the pending button `aria-disabled="true"` and ignore repeat clicks in the handler. Native `disabled` on the focused button drops focus to `<body>`.
- Announce results. Success goes through a polite live region. On failure, focus the first invalid field. Reserve `role="alert"` for form-level errors not tied to a field ([screen-readers.md](screen-readers.md)).
- Warn on unsaved changes before navigation. A re-render or hydration must never reset a field's typed value or move focus out of it.
