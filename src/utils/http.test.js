import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detailText, readResponse } from './http.js';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('a good answer comes back as its data', async () => {
  assert.deepEqual(await readResponse(json(200, { ok: 1 })), { ok: 1 });
});

test('an answer with no body is an empty object, not an error', async () => {
  assert.deepEqual(await readResponse(new Response(null, { status: 204 })), {});
});

test('a refusal carries the server’s own explanation', async () => {
  await assert.rejects(readResponse(json(400, { detail: 'Current password is incorrect' })), {
    message: 'Current password is incorrect',
  });
});

test('a 401 on a normal request means the session is over: sign out, say so', async () => {
  let signedOut = 0;
  await assert.rejects(
    readResponse(json(401, { detail: 'Invalid authentication credentials' }), { onSessionExpired: () => { signedOut += 1; } }),
    { message: 'Session expired' },
  );
  assert.equal(signedOut, 1);
});

test('a 401 on the sign-in itself is a wrong password: show it, don’t sign out', async () => {
  let signedOut = 0;
  await assert.rejects(
    readResponse(json(401, { detail: 'Invalid credentials' }), { sessionAware: false, onSessionExpired: () => { signedOut += 1; } }),
    { message: 'Invalid credentials' },
  );
  assert.equal(signedOut, 0);
});

test('a refusal with no readable body still gets a plain message', async () => {
  await assert.rejects(readResponse(new Response('<html>bad gateway</html>', { status: 502 })), {
    message: 'Server error',
  });
});

test('a validation answer is shown as sentences, not as [object Object]', async () => {
  const body = {
    detail: [
      { loc: ['body', 'amount_eur'], msg: 'Input should be a valid number', type: 'float_parsing' },
      { loc: ['body', 'date'], msg: 'Invalid date', type: 'value_error' },
    ],
  };
  await assert.rejects(readResponse(json(422, body)), {
    message: 'Input should be a valid number. Invalid date',
  });
});

test('detail text handles every shape the server can send', () => {
  assert.equal(detailText('Nope'), 'Nope');
  assert.equal(detailText([{ msg: 'a' }, { msg: 'b' }]), 'a. b');
  assert.equal(detailText([{ msg: 'a.' }, { msg: 'b.' }]), 'a. b');
  assert.equal(detailText(['plain']), 'plain');
  assert.equal(detailText(undefined), 'Server error');
  assert.equal(detailText(null), 'Server error');
  assert.equal(detailText({}), 'Server error');
  assert.equal(detailText(''), 'Server error');
});
