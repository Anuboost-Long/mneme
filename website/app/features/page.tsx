import type { Metadata } from "next";
import {
  ArrowsDownUpIcon,
  BrainIcon,
  CalendarCheckIcon,
  CardsIcon,
  ChatsCircleIcon,
  ClockCounterClockwiseIcon,
  CommandIcon,
  DownloadSimpleIcon,
  ExamIcon,
  FilePdfIcon,
  GraduationCapIcon,
  HardDrivesIcon,
  HighlighterIcon,
  KeyboardIcon,
  LightningIcon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  PaletteIcon,
  RobotIcon,
  ScanIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SpeakerHighIcon,
  SquaresFourIcon,
  TextAaIcon,
  TextTIcon,
  UserFocusIcon,
  WaveformIcon
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

export const metadata: Metadata = { title: "Features", description: "Everything mneme does, from importing your course to revising it." };

import DownloadButton from "../components/DownloadButton";
import Reveal from "../components/Reveal";
import SiteShell from "../components/SiteShell";

type Feature = { icon: Icon; title: string; body: string };
type Group = { title: string; intro: string; features: Feature[] };

const groups: Group[] = [
  {
    title: "Bring it in",
    intro: "Everything your course gives you, in one library.",
    features: [
      {
        icon: DownloadSimpleIcon,
        title: "Import anything",
        body: "Drop PDFs, Word documents, slides, text and pictures on a module, or paste a link."
      },
      {
        icon: GraduationCapIcon,
        title: "Your school’s pages",
        body: "Sign in to your course site inside mneme and import a page with its due date."
      },
      {
        icon: ScanIcon,
        title: "Text from pictures",
        body: "Screenshots and scanned pages become searchable text, read on your Mac."
      },
      {
        icon: SquaresFourIcon,
        title: "Sorted for you",
        body: "Each page is marked as a lecture, reading, assignment or exercise as it arrives."
      }
    ]
  },
  {
    title: "Record and listen",
    intro: "For the parts of a course that aren’t written down.",
    features: [
      {
        icon: MicrophoneIcon,
        title: "Record lectures",
        body: "Record the room, your computer’s sound, or both, with echo and noise reduction."
      },
      {
        icon: WaveformIcon,
        title: "Transcribe on your Mac",
        body: "Recordings and lecture videos turn into text you can edit, search and study."
      },
      {
        icon: SpeakerHighIcon,
        title: "Read aloud",
        body: "Listen to a page, a selection or a module summary, with each word highlighted as it’s read."
      }
    ]
  },
  {
    title: "Ask AI",
    intro: "An assistant that knows your course, with you in charge.",
    features: [
      {
        icon: ChatsCircleIcon,
        title: "Ask about your notes",
        body: "Answers come from your own pages, and it shows what it read."
      },
      {
        icon: RobotIcon,
        title: "Agent mode",
        body: "Let it make pages, flashcards and tasks. You approve each change, once or always."
      },
      {
        icon: MagicWandIcon,
        title: "AI actions",
        body: "Summarize, explain, simplify or translate a selection, or write your own actions."
      },
      {
        icon: UserFocusIcon,
        title: "AI profiles",
        body: "Tell it your language and level once, per course if you like."
      },
      {
        icon: SlidersHorizontalIcon,
        title: "Your choice of agent",
        body: "Claude, Codex, Gemini, Copilot or Cursor. Pick a default and switch for any task."
      }
    ]
  },
  {
    title: "Revise",
    intro: "From notes to knowing it.",
    features: [
      {
        icon: LightningIcon,
        title: "Prepare module",
        body: "A summary, revision notes, flashcards and a practice quiz from one click."
      },
      {
        icon: CardsIcon,
        title: "Flashcards",
        body: "Made from your pages and scheduled so each card returns before you forget it."
      },
      {
        icon: ExamIcon,
        title: "Quizzes",
        body: "Multiple choice, true or false and short answer, on a page or a whole module."
      },
      {
        icon: BrainIcon,
        title: "Study mode",
        body: "Summary, cards, then a quiz, ending with the topics you should review again."
      },
      {
        icon: FilePdfIcon,
        title: "Share as PDF",
        body: "Send a summary, your notes or a flashcard deck to a friend by AirDrop, Messages or Mail, or save the file."
      }
    ]
  },
  {
    title: "Find and plan",
    intro: "Everything one shortcut away.",
    features: [
      {
        icon: MagnifyingGlassIcon,
        title: "Search by meaning",
        body: "Describe what you remember and find the page, even without its exact words."
      },
      {
        icon: CommandIcon,
        title: "Command palette",
        body: "Open any page, run any action or ask the assistant from ⌘P."
      },
      {
        icon: CalendarCheckIcon,
        title: "Tasks and due dates",
        body: "Assignments, quizzes and discussions are found in your pages and listed by date."
      },
      {
        icon: KeyboardIcon,
        title: "Keyboard shortcuts",
        body: "Change the keys for common actions to ones you already know."
      }
    ]
  },
  {
    title: "Write and make it yours",
    intro: "A notebook that fits the way you study.",
    features: [
      {
        icon: TextTIcon,
        title: "A real editor",
        body: "Headings, tables, code, images and slash commands, saved as you type."
      },
      {
        icon: HighlighterIcon,
        title: "Highlights",
        body: "Mark what matters and see every highlight in a module together."
      },
      {
        icon: ArrowsDownUpIcon,
        title: "Drag to organise",
        body: "Reorder courses, modules and pages, or move a page to another module."
      },
      {
        icon: PaletteIcon,
        title: "Colours and icons",
        body: "Light or dark, an accent colour, and an icon for every course and page."
      },
      {
        icon: TextAaIcon,
        title: "Comfortable reading",
        body: "Choose the font, text size and page width for long reading sessions."
      }
    ]
  },
  {
    title: "Private by design",
    intro: "Your library, on your computer.",
    features: [
      {
        icon: HardDrivesIcon,
        title: "Stored on your Mac",
        body: "No account and no cloud library. Your courses never leave unless you send them to an AI."
      },
      {
        icon: ShieldCheckIcon,
        title: "Backups you control",
        body: "Save your whole library, with its files, to one backup and restore it anytime."
      },
      {
        icon: ClockCounterClockwiseIcon,
        title: "Recently deleted",
        body: "Deleted courses, modules and pages wait 30 days before they’re gone."
      }
    ]
  }
];

export default function FeaturesPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden className="dot-grid absolute inset-0 mask-[radial-gradient(ellipse_60%_80%_at_20%_30%,#000,transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-16 sm:px-6 lg:pt-24 lg:pb-20">
          <Reveal className="max-w-3xl">
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl">
              Everything mneme does.
            </h1>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-muted">
              One app for your whole course: bringing it in, making sense of it and revising it.
            </p>
          </Reveal>
        </div>
      </section>

      {groups.map((group) => (
        <section key={group.title} className="border-b border-line py-16 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
            <Reveal className="lg:sticky lg:top-28 lg:self-start">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{group.title}</h2>
              <p className="mt-3 max-w-[32ch] leading-relaxed text-muted">{group.intro}</p>
            </Reveal>
            <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
              {group.features.map(({ icon: FeatureIcon, title, body }, index) => (
                <Reveal key={title} delay={(index % 2) * 0.06}>
                  <FeatureIcon className="size-7" aria-hidden />
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted">{body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="py-20 lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 sm:px-6 md:flex-row md:items-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Try it on your next module.</h2>
          <DownloadButton />
        </div>
      </section>
    </SiteShell>
  );
}
