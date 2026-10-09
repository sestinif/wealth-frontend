// Reading the server's answer. Kept free of browser globals (no localStorage,
// no window) so it can be tested; api.js supplies the sign-out.

// FastAPI sends `detail` as a string for its own refusals, but as a LIST of
// { loc, msg } objects when the input fails validation. Handing that list to
// `new Error()` printed "[object Object]" in the toast.
export function detailText(detail) {
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length) {
    const parts = detail
      .map(d => (typeof d === 'string' ? d : d && typeof d.msg === 'string' ? d.msg : ''))
      .map(s => s.trim().replace(/\.$/, ''))
      .filter(Boolean);
    if (parts.length) return parts.join('. ');
  }
  return 'Server error';
}

// `sessionAware: false` is for the sign-in request itself. A 401 there is a
// wrong password, not an expired session: it must reach the form as its own
// message. Treated as "session expired", it reloaded the login page and the
// message was lost, so a typo looked like the page had simply blinked.
export async function readResponse(response, { onSessionExpired, sessionAware = true } = {}) {
  if (response.status === 401 && sessionAware) {
    onSessionExpired?.();
    throw new Error('Session expired');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(detailText(body?.detail));
  }
  return response.json().catch(() => ({}));
}
