import agentAlwaysAllow from "@/features/guide/assets/agent-always-allow.jpg";
import agentPermissionsActivity from "@/features/guide/assets/agent-permissions-activity.jpg";
import assistantAnswer from "@/features/guide/assets/assistant-answer.jpg";
import chatAgentApproval from "@/features/guide/assets/chat-agent-approval.jpg";
import chatAskMode from "@/features/guide/assets/chat-ask-mode.jpg";
import customizeReadingPageTypes from "@/features/guide/assets/customize-reading-page-types.jpg";
import flashcardsDeck from "@/features/guide/assets/flashcards-deck.jpg";
import flashcardsStudy from "@/features/guide/assets/flashcards-study.jpg";
import iconPicker from "@/features/guide/assets/icon-picker.jpg";
import iconSearch from "@/features/guide/assets/icon-search.jpg";
import importAiAnswer from "@/features/guide/assets/import-ai-answer.jpg";
import importAssignmentPage from "@/features/guide/assets/import-assignment-page.jpg";
import importAssignmentPreview from "@/features/guide/assets/import-assignment-preview.jpg";
import importBrowserWindow from "@/features/guide/assets/import-browser-window.jpg";
import importFileChosen from "@/features/guide/assets/import-file-chosen.jpg";
import importFiles from "@/features/guide/assets/import-files.jpg";
import importFromUrl from "@/features/guide/assets/import-from-url.jpg";
import importLectureTranscript from "@/features/guide/assets/import-lecture-transcript.jpg";
import importPastedPicture from "@/features/guide/assets/import-pasted-picture.jpg";
import importUnsure from "@/features/guide/assets/import-unsure.jpg";
import moduleImportButton from "@/features/guide/assets/module-import-button.jpg";
import paletteAsk from "@/features/guide/assets/palette-ask.jpg";
import prepareChoices from "@/features/guide/assets/prepare-choices.jpg";
import prepareModule from "@/features/guide/assets/prepare-module.jpg";
import prepareNotes from "@/features/guide/assets/prepare-notes.jpg";
import prepareRunning from "@/features/guide/assets/prepare-running.jpg";
import searchByMeaning from "@/features/guide/assets/search-by-meaning.jpg";
import sharePdfDeck from "@/features/guide/assets/share-pdf-deck.jpg";
import sharePdfMenu from "@/features/guide/assets/share-pdf-menu.jpg";
import sharePdfPage from "@/features/guide/assets/share-pdf-page.jpg";
import studyFlashcards from "@/features/guide/assets/study-flashcards.jpg";
import studyPreparing from "@/features/guide/assets/study-preparing.jpg";
import studyReady from "@/features/guide/assets/study-ready.jpg";
import studyResults from "@/features/guide/assets/study-results.jpg";
import studySummary from "@/features/guide/assets/study-summary.jpg";

export type GuideScreenshot = { src: string; alt: string; landscape?: boolean };

export type GuideStep = { title: string; body: string[]; screenshots: GuideScreenshot[] };

export type GuideTopic = {
  id: string;
  label: string;
  title: string;
  summary: string;
  where: string;
  place?: { label: string; path: string };
  steps: GuideStep[];
};

export const guideTopics: GuideTopic[] = [
  {
    id: "import-file",
    label: "Import",
    title: "Import a file, a link, a picture or a lecture",
    summary:
      "Turn a course brief, an article, a screenshot or a recorded lecture into a page. mneme works out what kind of page it is, finds its due dates, activities and files, and notes where it came from.",
    where: "Any module → Import, ⌘P → Import, or drop files on a module’s pages",
    place: { label: "Go to your courses", path: "/courses" },
    steps: [
      {
        title: "Open the module and press Import",
        body: [
          "Go to the module the page belongs in. Import sits next to New page, above the pages.",
          "From the command palette (⌘P), Import opens it too while you’re on a module. Dropping files on the module’s pages opens it with those files."
        ],
        screenshots: [
          { src: moduleImportButton, alt: "Module 4, with Import beside New page above the pages" }
        ]
      },
      {
        title: "Choose From files and add the files",
        body: [
          "Drop files on the dialog, or press Choose files…. PDF, Word, Markdown and text files work, and so do pictures, audio and video.",
          "For one file, press Read file. Add several and each becomes its own page: Import N files brings them in one after the other and lists any that failed, with why."
        ],
        screenshots: [
          {
            src: importFileChosen,
            alt: "The Import dialog on From files, with a PDF ready to import"
          },
          {
            src: importFiles,
            alt: "Seven files ready to import: text, a picture, audio and three videos",
            landscape: true
          }
        ]
      },
      {
        title: "Paste a screenshot or text",
        body: [
          "Press ⌘V anywhere in Import. A picture or screenshot imports as a picture, a link fills Page URL, and copied text or web content becomes a page.",
          "A picture’s page shows the picture with the text recognized in it, tables kept as tables."
        ],
        screenshots: [
          { src: importPastedPicture, alt: "A pasted picture ready to import", landscape: true }
        ]
      },
      {
        title: "Recordings and videos are transcribed",
        body: [
          "An audio file becomes a Lecture page with the recording, a video a Lecture page with a player. Their sound is transcribed on this Mac in the background, one at a time, and the corner shows the progress.",
          "The transcript goes under the recording or video, with any due dates it mentions. A video with no sound says so."
        ],
        screenshots: [
          {
            src: importLectureTranscript,
            alt: "A lecture video with its transcript and a due date below it",
            landscape: true
          }
        ]
      },
      {
        title: "Import an article or any website",
        body: [
          "On From a link, paste the address and press Fetch page. An article comes in as the article alone, with its author, site and date at the top.",
          "Notion, Google Docs and pages that come back empty build themselves with JavaScript. Press Open in a browser window, go to the page there, then press Import this page."
        ],
        screenshots: [
          {
            src: importBrowserWindow,
            alt: "Notion builds its pages with JavaScript, with Open in a browser window",
            landscape: true
          }
        ]
      },
      {
        title: "Check what mneme found",
        body: [
          "Page title comes from the document’s own title or the file name, and you can change it.",
          "Type is picked from what the page looks like, and the line under it says why, for example “Looks like an assignment.”",
          "Due dates lists every line that sets a deadline, with its label. When a line gives a date, it says how it was read, such as “Read as 14 Dec 2021”. Activities and Files show the same way.",
          "Untick anything you don’t want, then press Import page."
        ],
        screenshots: [
          {
            src: importAssignmentPreview,
            alt: "The preview: Type Assignment, Looks like an assignment, and two due dates ticked"
          }
        ]
      }
    ]
  },
  {
    id: "ask-ai",
    label: "Ask AI",
    title: "When mneme can’t tell what a page is",
    summary:
      "Some material, like a textbook chapter, gives no clue in its title or headings. mneme says so and lets the AI decide.",
    where: "The import preview → Ask AI",
    place: { label: "Connect an agent", path: "/agent-chat" },
    steps: [
      {
        title: "Press Ask AI",
        body: [
          "mneme leaves the Type at Lesson and offers Ask AI instead of guessing.",
          "It sends the title, the headings and the start of the text to your default agent, the one chosen in Settings → AI. Connect an agent in Agent chat first."
        ],
        screenshots: [
          {
            src: importUnsure,
            alt: "The preview: Couldn’t tell what kind of page this is, with Ask AI"
          }
        ]
      },
      {
        title: "The answer sets the Type",
        body: [
          "A few seconds later the Type changes and the line says the AI chose it. You can still pick another type before importing."
        ],
        screenshots: [
          {
            src: importAiAnswer,
            alt: "The preview after Ask AI: Type Reading, The AI says this is a reading"
          }
        ]
      }
    ]
  },
  {
    id: "import-school-page",
    label: "School site pages",
    title: "Import a page from your school’s site",
    summary:
      "Bring in a Moodle, Canvas or Brightspace page with its activities, files and due dates, including pages that need your login.",
    where: "Any module → Import → From a link",
    place: { label: "School site settings", path: "/settings/general" },
    steps: [
      {
        title: "Paste the page’s address",
        body: [
          "In Import, stay on From a link, paste the address into Page URL and press Fetch page.",
          "For a page that needs your login, press Sign in to your school site instead. A browser window opens beside mneme: sign in as usual, go to the page, and press Import this page in that window’s toolbar. You stay signed in next time; sign out under Settings → General → School site."
        ],
        screenshots: [
          {
            src: importFromUrl,
            alt: "The Import dialog on From a link, with Sign in to your school site under Page URL"
          }
        ]
      },
      {
        title: "An assignment page brings its due date",
        body: [
          "The page’s address says it’s an assignment, and its Due line comes with it, read as a date. The site’s name is left out of the title."
        ],
        screenshots: [
          {
            src: importAssignmentPage,
            alt: "The preview of a Moodle assignment, due 14 December 2021"
          }
        ]
      },
      {
        title: "What ends up on the page",
        body: [
          "Whatever you left ticked goes at the top of the new page: a Due dates list, an Activities checklist you tick off as you go, and a Files list of links back to the school’s copy."
        ],
        screenshots: []
      }
    ]
  },
  {
    id: "ask-and-agent",
    label: "Ask and Agent",
    title: "Ask and Agent mode in Chat",
    summary:
      "Ask a question from anywhere and get an answer from your own pages, or let the agent create and change them.",
    where: "⌘P → type a question, or Chat → the Ask / Agent switch above the message box",
    place: { label: "Open Chat", path: "/agent-chat" },
    steps: [
      {
        title: "Ask from anywhere with ⌘P",
        body: [
          "Press ⌘P, type your question and choose Ask. The assistant opens beside the screen you’re on and answers in Ask mode, using the agent your AI actions run with.",
          "On a page, it knows which page you’re on, so “this page” means it. Without a question, Ask the assistant just opens it."
        ],
        screenshots: [
          {
            src: paletteAsk,
            alt: "The command palette with Ask: What are the motives that drive an attacker?",
            landscape: true
          },
          {
            src: assistantAnswer,
            alt: "The assistant beside the cyber threats page, answering in Ask mode",
            landscape: true
          }
        ]
      },
      {
        title: "Ask: find and explain your material",
        body: [
          "New conversations start in Ask. The agent searches and reads your courses, modules and pages and answers from them, without changing anything.",
          "If you ask it to make a change, it describes the change instead and tells you to switch to Agent."
        ],
        screenshots: [
          {
            src: chatAskMode,
            alt: "An Ask mode answer summarising a page, ending with a note that it didn't create the page",
            landscape: true
          }
        ]
      },
      {
        title: "Agent: let it make changes",
        body: [
          "Switch to Agent and the agent can create and change pages. It asks before each change; tick Always allow to stop it asking about that kind of change. Replacing what’s on a page always asks.",
          "Deny keeps everything as it was. Each message gets up to 50 tool calls, the agent is stopped if it keeps repeating the same call, and Stop ends it any time. Settings → Agent tools lists what’s allowed and everything the agent did."
        ],
        screenshots: [
          {
            src: chatAgentApproval,
            alt: "Agent wants to make a change: Create a page titled Attacker types, with Deny and Approve",
            landscape: true
          }
        ]
      }
    ]
  },
  {
    id: "agent-permissions",
    label: "Agent permissions",
    title: "What the agent may do, and what it did",
    summary:
      "Decide which changes the agent may make without asking, and look back at everything it read or changed.",
    where: "Settings → Agent tools → Permissions and Activity",
    place: { label: "Open Agent tools", path: "/settings/agent-tools" },
    steps: [
      {
        title: "Allow once, or always",
        body: [
          "When the agent wants to create, edit or move a page, it asks. Tick Always allow to stop it asking about that kind of change, then press Allow.",
          "Replacing what’s on a page always asks, and anything that deletes will too."
        ],
        screenshots: [
          {
            src: agentAlwaysAllow,
            alt: "Agent wants to make a change, with Always allow the agent to create pages, Deny and Allow",
            landscape: true
          }
        ]
      },
      {
        title: "Change permissions and check the activity",
        body: [
          "Permissions lists what each kind of change covers. Tick or untick Allow without asking for Create, Edit and Move.",
          "Activity lists every call the agent made, newest first: what it was, which conversation, and whether it was read, allowed, denied, failed or blocked in Ask mode."
        ],
        screenshots: [
          {
            src: agentPermissionsActivity,
            alt: "Settings → Agent tools with the Permissions list and an Activity entry: Denied",
            landscape: true
          }
        ]
      }
    ]
  },
  {
    id: "search",
    label: "Search",
    title: "Find anything with ⌘P",
    summary:
      "Find courses, modules, pages and attachments by their words, and pages by what they’re about.",
    where: "⌘P from anywhere; the search model in Settings → Extensions",
    place: { label: "Get a search model", path: "/settings/extensions" },
    steps: [
      {
        title: "Search by words",
        body: [
          "Press ⌘P and type. Courses, modules, pages (by title or content) and attachments (by file name) are listed; Enter opens the first.",
          "Recordings has its own search over names and transcripts, and ⌘F finds words on the page you’re reading."
        ],
        screenshots: []
      },
      {
        title: "Search by meaning",
        body: [
          "Download BGE Small (English), or E5 Small for other languages, in Settings → Extensions. mneme indexes your pages on this device; nothing is sent anywhere.",
          "Then a question in ⌘P also lists By meaning: pages about it even when they don’t use your words, with the passage that matched. The assistant can search the same way."
        ],
        screenshots: [
          {
            src: searchByMeaning,
            alt: "⌘P with “why do people hack”, listing the cyber threats chapters By meaning",
            landscape: true
          }
        ]
      }
    ]
  },
  {
    id: "tasks",
    label: "Tasks",
    title: "Keep track of exercises, discussions and assignments",
    summary:
      "Imported activities become tasks on their own; add your own, give them due dates, and tick them off.",
    where: "Sidebar → Tasks, ⌘P → Tasks, or the Tasks widget on Home",
    place: { label: "Open Tasks", path: "/tasks" },
    steps: [
      {
        title: "Tasks from your imports",
        body: [
          "When you import a page, each ticked activity in the preview becomes a task in that module. An assignment, quiz, discussion or exercise page becomes a task too, due on the earliest date found.",
          "Importing the same page again doesn’t add the same task twice."
        ],
        screenshots: []
      },
      {
        title: "Your own tasks and due dates",
        body: [
          "New task asks for a name, a type, a due date and, if you like, a course and module. Pick the date from the calendar: arrow keys move a day or a week, and the month title switches to months and years.",
          "Tasks are grouped as Overdue, Today, This week, Later and No due date. Tick one to move it to Done; untick it to bring it back. Add the Tasks widget to Home to see the next few there."
        ],
        screenshots: []
      }
    ]
  },
  {
    id: "flashcards",
    label: "Flashcards",
    title: "Study a module with flashcards",
    summary:
      "mneme turns your pages into flashcards on its own, then brings each card back just before you’d forget it.",
    where: "A module → Flashcards, or ⌘P → Study flashcards",
    place: { label: "Go to your courses", path: "/courses" },
    steps: [
      {
        title: "Cards are made for you",
        body: [
          "Pages you import get flashcards in the background, using the agent your AI actions use. Turn this off with Make flashcards for pages you import.",
          "On a module’s Flashcards, Make flashcards goes through every page that has no cards yet, one page at a time. Add card writes your own, and Edit or Delete fixes any card."
        ],
        screenshots: [
          {
            src: flashcardsDeck,
            alt: "A module’s flashcards being made from its pages",
            landscape: true
          }
        ]
      },
      {
        title: "Study what’s due",
        body: [
          "Study shows each due card’s front. Press Space to see the answer, then Again, Hard, Good or Easy (keys 1 to 4); each shows when the card comes back.",
          "Again brings it back in 10 minutes and counts as wrong. Good brings a new card back tomorrow, then in 3 days, then further apart each time."
        ],
        screenshots: [
          {
            src: flashcardsStudy,
            alt: "Studying a card with its answer and the four grades",
            landscape: true
          }
        ]
      }
    ]
  },
  {
    id: "share-pdf",
    label: "Share as PDF",
    title: "Send a page or flashcards to a friend as a PDF",
    summary:
      "Share as PDF turns a page, such as a summary or revision notes, or a whole flashcard deck into a PDF and opens the share menu, so you can send it by AirDrop, Messages or Mail. Your friend doesn’t need mneme.",
    where: "A page → Share as PDF, or a module’s Flashcards → Share as PDF",
    place: { label: "Go to your courses", path: "/courses" },
    steps: [
      {
        title: "Press Share as PDF and pick where to send it",
        body: [
          "On any page, Share as PDF sits next to Edit page. On a module’s Flashcards it sits next to Add card. It’s greyed out while the page is empty or the deck has no cards.",
          "The share menu opens under the button. Choose AirDrop, Messages, Mail or another app; the file is named after the page or deck."
        ],
        screenshots: [
          { src: sharePdfMenu, alt: "The share menu under Share as PDF on a revision notes page", landscape: true }
        ]
      },
      {
        title: "What your friend gets",
        body: [
          "A page keeps its headings, lists, tables, pictures and highlights, on A4 or Letter paper with page numbers. Toggles print open, and recordings, attachments and videos are listed by name.",
          "A deck lists every card, question in bold and answer below, with the page it came from. A card never splits across two pages, and your study progress isn’t included.",
          "Khmer, Arabic and similar scripts look right in the PDF, but copying or searching that text in the PDF can give the wrong letters. That’s a limit of the PDF writer in macOS."
        ],
        screenshots: [
          { src: sharePdfPage, alt: "The first page of revision notes as a PDF" },
          { src: sharePdfDeck, alt: "The first page of a flashcard deck as a PDF" }
        ]
      }
    ]
  },
  {
    id: "prepare",
    label: "Prepare module",
    title: "Prepare a module for revision in one go",
    summary:
      "mneme reads a whole module, including attached files, text in pictures and recordings, then makes a summary, revision notes, flashcards and a practice quiz.",
    where: "A module → Prepare module, or ⌘P → Prepare module",
    place: { label: "Go to your courses", path: "/courses" },
    steps: [
      {
        title: "Choose what to make",
        body: [
          "Tick Summary, Revision notes, Flashcards and Practice quiz. Each says what already exists: flashcards are only made for pages without any, and a new summary, notes page or practice quiz replaces the last one.",
          "The line above Prepare module says about how many agent runs it takes, so you know the cost before you start."
        ],
        screenshots: [
          {
            src: prepareChoices,
            alt: "Prepare Module 4 with Summary, Revision notes and Practice quiz ticked, about 4 agent runs",
            landscape: true
          }
        ]
      },
      {
        title: "It works in the background",
        body: [
          "mneme reads every page, the PDF, Word and text files attached to them, the text in their pictures and their recordings’ transcripts, transcribing any recording that has none. Long pages are condensed first and kept, so preparing again is quicker and cheaper.",
          "Keep working while it runs. Stop in the corner keeps whatever is already made."
        ],
        screenshots: [
          {
            src: prepareRunning,
            alt: "Condensing a long page, 1 of 3, with Stop in the corner",
            landscape: true
          }
        ]
      },
      {
        title: "Everything in one place",
        body: [
          "Prepared module lists the original material, the exercises and discussions, the Summary and Revision notes pages, your flashcards, the practice quiz and any tasks not yet in Tasks, with Review and add.",
          "The Summary and Revision notes pages sit at the top of the module, and Listen on the module reads the summary. Study sessions use the same key topics."
        ],
        screenshots: [
          {
            src: prepareModule,
            alt: "Prepared module: original material, exercises, summary, revision notes, flashcards, practice quiz and tasks",
            landscape: true
          },
          {
            src: prepareNotes,
            alt: "Revision notes: a topic with its key terms and key points",
            landscape: true
          }
        ]
      }
    ]
  },
  {
    id: "study",
    label: "Study mode",
    title: "Revise a module in one study session",
    summary:
      "A study session sums up a module’s key topics, runs your due flashcards and a quiz, then shows which topics need more work.",
    where: "A module → Study, or ⌘P → Study this module",
    place: { label: "Go to your courses", path: "/courses" },
    steps: [
      {
        title: "Prepare a session",
        body: [
          "On a module’s Study screen, New study session asks the agent your AI actions use for a summary of the module, its key topics and a 10-question quiz. If the module has no flashcards yet, it writes some too.",
          "It’s prepared in the background, so keep working. When it’s ready, a pop-up offers Start session."
        ],
        screenshots: [
          {
            src: studyPreparing,
            alt: "A study session being prepared, 3 of 10 questions written",
            landscape: true
          },
          {
            src: studyReady,
            alt: "“Your study session is ready” with Start session",
            landscape: true
          }
        ]
      },
      {
        title: "Summary, flashcards, then the quiz",
        body: [
          "Read the summary and each topic, with links to the pages it comes from. Then review the flashcards that are due, graded as usual, and take the quiz. Skip to the quiz leaves the cards for later.",
          "The quiz is saved in Quizzes too, so you can take it again on its own."
        ],
        screenshots: [
          {
            src: studySummary,
            alt: "A session’s summary, with the four steps above it",
            landscape: true
          },
          {
            src: studyFlashcards,
            alt: "A due flashcard in the session, with Skip to the quiz",
            landscape: true
          }
        ]
      },
      {
        title: "Weak areas and what to review",
        body: [
          "Results show your quiz score, your cards right and wrong, and how each topic went. A topic is weak when under 70% of its questions and cards were right.",
          "Recommended review lists the weak topics, worst first, with the pages to re-read. Study again runs the session once more, and the Study screen keeps each session’s results."
        ],
        screenshots: [
          {
            src: studyResults,
            alt: "Results: the quiz score, each topic’s score, and the recommended review",
            landscape: true
          }
        ]
      }
    ]
  },
  {
    id: "customize",
    label: "Make mneme yours",
    title: "Colours, layout, reading and page types",
    summary:
      "Pick an accent colour, how wide things are, the font and size your pages are read in, and your own kinds of page.",
    where: "Settings → General",
    place: { label: "Open Settings", path: "/settings/general" },
    steps: [
      {
        title: "Appearance and layout",
        body: [
          "Under Appearance, choose light or dark and an accent colour; each accent has a shade for each theme.",
          "Under Layout, set the sidebar width and how wide pages are, and turn on Compact mode to fit more on screen. These are saved on this device."
        ],
        screenshots: []
      },
      {
        title: "Reading and page types",
        body: [
          "Under Reading, choose your pages’ font (Avenir Next, System, Serif or Rounded) and text size; the sample shows the result.",
          "Under Page types, add your own kinds of page, like Lab report. They appear in every Type picker and in grouping and filters. Deleting one turns its pages into Custom."
        ],
        screenshots: [
          {
            src: customizeReadingPageTypes,
            alt: "Settings → General with Layout, Reading with a sample, and Page types",
            landscape: true
          }
        ]
      }
    ]
  },
  {
    id: "icons",
    label: "Icons",
    title: "Give a course, module or page an icon",
    summary:
      "Pick from 122 icons in 8 groups, from Study and Science to Health, Law and the Arts, or search by subject.",
    where: "Edit course, Edit module or Edit page → Icon",
    place: { label: "Go to your courses", path: "/courses" },
    steps: [
      {
        title: "Pick one, or search by subject",
        body: [
          "Type a subject in Search icons, such as “law”, “biology” or “music”, and only the matching icons stay. Hold the pointer on an icon to see its name.",
          "You can still paste an emoji under Custom icon or upload a picture. Press Save changes to keep it."
        ],
        screenshots: [
          {
            src: iconPicker,
            alt: "The Icon section: a search field and the Study and Science groups"
          },
          { src: iconSearch, alt: "Search icons with “law” typed, showing only the Law icon" }
        ]
      }
    ]
  }
];

export const findGuideTopic = (id: string | undefined) =>
  guideTopics.find((topic) => topic.id === id);
