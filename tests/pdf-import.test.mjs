import assert from "node:assert/strict";
import { test } from "node:test";
import "./support/desktop.mjs";

const { pdfPagesToHtml } = await import("../src/features/courses/lib/pdf-structure.ts");

function run(str, x, y, { height = 10, font = "Book-Light", sideways = false, endsLine = true } = {}) {
  const transform = sideways ? [0, height, -height, 0, x, y] : [height, 0, 0, height, x, y];
  return { str, hasEOL: endsLine, height, width: str.length * height * 0.5, transform, font };
}

function bookPage(number, body) {
  return {
    runs: [
      run(number % 2 ? "CYBER SECURITY" : "CYBER THREATS", 300, 650, { height: 7 }),
      ...body,
      run(String(73 + number), 300, 34),
      run("Sutton, D. (2022). Cyber security. Created from think on 2026-10-05.", 0, -14, { height: 6 }),
      run("Copyright © 2022. All rights reserved.", 0, 48, { height: 6, sideways: true })
    ],
    images: [],
    height: 733
  };
}

const chapter = [
  bookPage(1, [
    run("5 CYBER THREATS", 50, 620, { height: 18 }),
    run("In this chapter, we examine threats.", 50, 580),
    run("y", 60, 550, { font: "Wingdings-Regular" }),
    run("Motive – most cybercrime is motivated by money, but", 72, 550)
  ]),
  bookPage(2, [
    run("there are elements who attack for revenge.", 72, 600),
    run("TYPES OF ATTACKER", 50, 560, { height: 11, font: "Book-Bold" }),
    run("Attackers fall into categories.", 50, 540)
  ]),
  bookPage(3, [
    run("Hacktivists", 50, 600, { height: 11, font: "Book-BoldItalic" }),
    run("They deface websites.", 50, 580, { endsLine: false }),
    run("1", 160, 583, { height: 6 }),
    run("1. See https://cyberlaw.ccdcoe.org/wiki/Estonia_(2007).", 50, 60, { height: 7 })
  ]),
  bookPage(4, [
    run("External attackers", 50, 600, { height: 11, font: "Book-Bold" }),
    run("They work from outside.", 50, 580)
  ])
];

test("a book chapter imports without its page furniture, as one flowing text", () => {
  const { html } = pdfPagesToHtml(chapter);
  for (const furniture of ["CYBER SECURITY", "CYBER THREATS<", "74", "77", "Sutton", "Copyright"])
    assert.ok(!html.includes(furniture), `${furniture} left in: ${html}`);
  assert.ok(html.includes("<li>Motive – most cybercrime is motivated by money, but there are elements who attack for revenge.</li>"));
});

test("the chapter title becomes the page title, and bold headings rank by style", () => {
  const { html, title } = pdfPagesToHtml(chapter);
  assert.equal(title, "5 CYBER THREATS");
  assert.ok(html.includes("<h2>TYPES OF ATTACKER</h2>"));
  assert.ok(html.includes("<h3>External attackers</h3>"));
  assert.ok(html.includes("<h4>Hacktivists</h4>"));
});

test("footnotes gather under Notes with their links, and the marker stays in the text", () => {
  const { html } = pdfPagesToHtml(chapter);
  assert.ok(html.includes("<p>They deface websites.[1]</p>"));
  assert.ok(
    html.endsWith(
      '<h2>Notes</h2><p>1. See <a href="https://cyberlaw.ccdcoe.org/wiki/Estonia_(2007)">https://cyberlaw.ccdcoe.org/wiki/Estonia_(2007)</a>.</p>'
    )
  );
});

test("a short document keeps its lines, minus a lone page number, and has no title heading", () => {
  const { html, title } = pdfPagesToHtml([
    {
      runs: [run("Week 3 notes", 50, 700, { height: 14 }), run("Read chapter 4 before the lab.", 50, 680), run("1", 300, 30)],
      images: [],
      height: 792
    },
    {
      runs: [run("Week 3 notes", 50, 700, { height: 14 }), run("Bring a laptop.", 50, 680), run("2", 300, 30)],
      images: [],
      height: 792
    }
  ]);
  assert.equal(title, undefined);
  assert.equal(
    html,
    "<h2>Week 3 notes</h2><p>Read chapter 4 before the lab.</p><h2>Week 3 notes</h2><p>Bring a laptop.</p>"
  );
});

test("numbered steps split by paragraphs keep counting", () => {
  const { html } = pdfPagesToHtml([
    {
      runs: [
        run("1. Select one scenario", 50, 700),
        run("Your facilitator provides the scenarios.", 50, 670),
        run("2. Analyse the scenario", 50, 640)
      ],
      images: [],
      height: 792
    }
  ]);
  assert.equal(
    html,
    '<ol><li>Select one scenario</li></ol><p>Your facilitator provides the scenarios.</p><ol start="2"><li>Analyse the scenario</li></ol>'
  );
});
