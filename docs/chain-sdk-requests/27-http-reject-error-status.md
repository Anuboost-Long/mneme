# Capability Request 27 — HTTP: reject error statuses, like axios

Source: developer experience. The user asked on 1 October 2026 that apps
shouldn't have to work hard to catch HTTP errors.

## The problem

`desktop.http` copies axios's request shape, but not its error behavior.
A 4xx/5xx response **resolves**, and every caller has to remember to
check `res.ok` (CONTRACT.md: "A non-2xx response still resolves — unlike
axios, which rejects"). Code written the axios way silently treats a 404
or 500 as success:

```ts
try {
  const { data } = await desktop.http.get<Course[]>(url);
  render(data); // runs with an error page's body
} catch { showError(); }
```

Every caller ends up with two error paths: a `catch` for network
failures and an `if (!res.ok)` for HTTP errors. mneme's
`fetchLmsPage` has exactly that shape.

## What's asked for

Make a non-2xx status reject by default, the way axios does, with axios's
escape hatch:

```ts
interface HttpRequestConfig {
  // …
  /** Which statuses resolve. Defaults to 200–299. `() => true` resolves every response. */
  validateStatus?: (status: number) => boolean;
}
```

- **Rejection shape:** a `ChainError` with a new code (for example
  `HTTP_ERROR`). The message names the status ("Request failed with
  status 404 Not Found"), and the full `HttpResponse` is attached
  (`error.response`, as in axios), so a caller can still read the
  status, headers or body of an error response.
- **Everything else stays:** `ok` stays on the response. The other codes
  (`UNAVAILABLE`, `INVALID_ARGUMENT`, `TOO_LARGE`, `NATIVE_FAILURE`) mean
  what they mean today.
- **Opting out:** `validateStatus: () => true` restores today's behavior
  for a caller that wants every response, such as a status checker.

The exact code name and where the response hangs off the error are
chain-sdk's contract decision (rule 1).

## Why change the default rather than add an option

Here an opt-in would be the hard path: the safe behavior has to be the
one you get without thinking. chain-sdk is early stage, and mneme is the
only consumer, with two callers (below). Breaking it now costs almost
nothing; breaking it later costs more.

## Impact on mneme

- `src/shared/lib/downloadImage.ts`: already catches everything and
  returns null. It keeps working unchanged; the `!response.ok` check
  becomes dead and can be removed.
- `src/features/courses/lib/lms-import.ts` (`fetchLmsPage`): the status
  message moves into its existing `catch`, mapped from the new code.
  Otherwise an HTTP error falls through to the generic "Couldn't fetch
  that page" message.

## Please update in mneme when done

Update mneme's `@chain/sdk` and the http CONTRACT.md, then signal the
mneme session. mneme will update the two callers above in the same
change, so neither breaks in between.
