import chatAgentApproval from "../assets/chat-agent-approval.jpg";
import assistantAnswer from "../assets/assistant-answer.jpg";
import chatAskMode from "../assets/chat-ask-mode.jpg";
import iconPicker from "../assets/icon-picker.jpg";
import iconSearch from "../assets/icon-search.jpg";
import importAiAnswer from "../assets/import-ai-answer.jpg";
import importAssignmentPage from "../assets/import-assignment-page.jpg";
import importAssignmentPreview from "../assets/import-assignment-preview.jpg";
import importCoursePage from "../assets/import-course-page.jpg";
import importFileChosen from "../assets/import-file-chosen.jpg";
import importFromUrl from "../assets/import-from-url.jpg";
import importUnsure from "../assets/import-unsure.jpg";
import moduleImportButton from "../assets/module-import-button.jpg";
import paletteAsk from "../assets/palette-ask.jpg";

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
    label: "Import a file",
    title: "Import a PDF, Word or Markdown file",
    summary:
      "Turn a course brief, a reading or your own notes into a page. mneme works out what kind of page it is and finds its due dates, activities and files.",
    where: "Any module → Import → From file",
    place: { label: "Go to your courses", path: "/courses" },
    steps: [
      {
        title: "Open the module and press Import",
        body: [
          "Go to the module the page belongs in. Import sits next to New page, above the pages.",
          "From the command palette (⌘P), Import PDF or document opens it too while you’re on a module."
        ],
        screenshots: [{ src: moduleImportButton, alt: "Module 4, with Import beside New page above the pages" }]
      },
      {
        title: "Choose From file and add the file",
        body: [
          "Drop the file on the dialog, or press Choose file…. PDF, Word (.docx) and Markdown files work. Dropping another file replaces it.",
          "Press Read file."
        ],
        screenshots: [{ src: importFileChosen, alt: "The Import dialog on From file, with a PDF ready to import" }]
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
          "It sends the title, the headings and the start of the text to the agent your AI actions use, the one chosen under Run with in the AI actions menu. Connect an agent in Agent chat first."
        ],
        screenshots: [
          { src: importUnsure, alt: "The preview: Couldn’t tell what kind of page this is, with Ask AI" }
        ]
      },
      {
        title: "The answer sets the Type",
        body: [
          "A few seconds later the Type changes and the line says the AI chose it. You can still pick another type before importing."
        ],
        screenshots: [{ src: importAiAnswer, alt: "The preview after Ask AI: Type Reading, The AI says this is a reading" }]
      }
    ]
  },
  {
    id: "import-school-page",
    label: "School site pages",
    title: "Import a page from your school’s site",
    summary:
      "Bring in a Moodle, Canvas or Brightspace page with its activities, files and due dates, including pages that need your login.",
    where: "Any module → Import → From URL",
    place: { label: "School site settings", path: "/settings/general" },
    steps: [
      {
        title: "Paste the page’s address",
        body: [
          "In Import, stay on From URL, paste the address into Page URL and press Fetch page.",
          "For a page that needs your login, press Sign in to your school site instead. A browser window opens beside mneme: sign in as usual, go to the page, and press Import this page in that window’s toolbar. You stay signed in next time; sign out under Settings → General → School site."
        ],
        screenshots: [
          { src: importFromUrl, alt: "The Import dialog on From URL, with Sign in to your school site under Page URL" }
        ]
      },
      {
        title: "A course page lists its activities and files",
        body: [
          "Each quiz, assignment and forum is listed with its kind, such as “Quiz: Factual recall test”. Course files and recordings are listed under Files, and the page reads as a module overview."
        ],
        screenshots: [
          { src: importCoursePage, alt: "The preview of a Moodle course page, with activities and files ticked" }
        ]
      },
      {
        title: "An assignment page brings its due date",
        body: [
          "The page’s address says it’s an assignment, and its Due line comes with it, read as a date. The site’s name is left out of the title."
        ],
        screenshots: [
          { src: importAssignmentPage, alt: "The preview of a Moodle assignment, due 14 December 2021" }
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
          { src: paletteAsk, alt: "The command palette with Ask: What are the motives that drive an attacker?", landscape: true },
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
          "Switch to Agent and the agent can create and change pages. It asks before its first change in a conversation, and every time it would replace what's on a page.",
          "Deny keeps everything as it was. The mode is saved with the conversation."
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
    id: "icons",
    label: "Icons",
    title: "Give a course, module or page an icon",
    summary: "Pick from 122 icons in 8 groups, from Study and Science to Health, Law and the Arts, or search by subject.",
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
          { src: iconPicker, alt: "The Icon section: a search field and the Study and Science groups" },
          { src: iconSearch, alt: "Search icons with “law” typed, showing only the Law icon" }
        ]
      }
    ]
  }
];

export const findGuideTopic = (id: string | undefined) => guideTopics.find((topic) => topic.id === id);
