// Keeps iOS Safari (and password managers) from showing the AutoFill bar
// (keys, cards, addresses) above the keyboard on the app's own inputs.
// Spread it on any non-auth field: <input {...noAutofill('wealth-amount')} />
// Login, sign-up and password fields must NOT use it.
export const NO_AUTOFILL = {
  autoComplete: 'off',
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-form-type': 'other',
  'data-bwignore': 'true',
};

export const noAutofill = (name) => (name ? { name, ...NO_AUTOFILL } : { ...NO_AUTOFILL });
