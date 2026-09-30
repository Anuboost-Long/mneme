# Capability Request 24 — Binary HTTP responses

Source: the user's AI actions (Summarize and the rest) couldn't see the
pictures on a page. mneme now sends a page's pictures to the agent as
image data (and exposes them through a `get_page_images` agent tool),
which works for images stored through `desktop.files`. It can't work for
pages imported from the web: their `<img>` tags still point at the source
site, and neither the webview nor `desktop.http` can fetch them.

## Why mneme can't do this today

- The webview's `fetch` is blocked cross-origin for most sites.
- `desktop.http` returns the body as text only (`HttpResponse.body:
  string`), so image bytes arrive corrupted.

## What's asked for

A way to get a response body as bytes, for example:

```
desktop.http.get(url, { responseType: "bytes" })
  → HttpResponse<Uint8Array>   // data (and body?) is the raw bytes
```

or a separate `desktop.http.download(url, config?) → { status, ok,
headers, bytes: Uint8Array }`. Whichever fits the http contract better.

Needs: follows redirects, reports the `content-type` header, respects
the existing timeout, and has a size limit (mneme caps images at 10 MB;
a `maxBytes` option or an error past a limit is fine).

## What mneme will do with it

1. **Web page import**: download each image in the imported page and
   store it through `desktop.files` (like PDF/DOCX/pasted images), so
   imported pages work offline and their pictures reach the agent.
2. **Older pages** that still hold remote image URLs: `extractImages`
   falls back to the binary GET when the webview can't fetch one.

Pages behind a login (e.g. an O'Reilly book) stay out of reach — Chain
doesn't hold the user's cookies — and that's fine; mneme marks those
images as not included.

## Please update in mneme when done

Update mneme's `@chain/sdk` and any `.chain/native` template for
`chain update`, update the http CONTRACT.md, then signal `mneme-c6`.
