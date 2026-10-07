import type { Metadata } from "next";

import LegalPage from "../components/LegalPage";

export const metadata: Metadata = { title: "Terms of use" };

const summary =
  "Mneme is an open-source project supplied for you to install and use at your own discretion. These terms describe use of the website and project; the software licence in the source repository governs the code itself.";

const sections = [
  {
    title: "Accepting these terms",
    paragraphs: [
      "By using this website or Mneme, you agree to these terms. If you do not agree, do not use the website or application.",
    ],
  },
  {
    title: "Open-source software",
    paragraphs: [
      "Mneme is not a subscription service and does not promise an ongoing service level, support response time or feature roadmap. If the source repository includes a software licence, that licence controls your permission to copy, modify, distribute and use the code. These terms do not replace or expand that licence.",
    ],
  },
  {
    title: "Your content and responsibility",
    paragraphs: [
      "You retain responsibility for the course material, notes, files, recordings and prompts you add to Mneme. Only add content you have the right to use. You are responsible for obtaining any necessary permissions from your institution, teachers, classmates, copyright owners or other people whose information appears in your content.",
      "Keep your own backups. Mneme is local-first, so deleting local data, losing access to a device or changing devices can affect access to your material.",
    ],
  },
  {
    title: "AI and third-party services",
    paragraphs: [
      "AI features connect to tools and providers that you select. You are responsible for reviewing their terms, privacy practices, pricing, account requirements and acceptable-use rules. Do not send confidential, personal, regulated or copyrighted material to a third party unless you are authorised to do so.",
      "AI output may be inaccurate, incomplete or unsuitable for your purpose. Review it before relying on it for study, work, legal, medical, financial or other important decisions.",
    ],
  },
  {
    title: "Acceptable use",
    paragraphs: [
      "Do not use Mneme or this website to break the law, infringe another person’s rights, distribute harmful code, interfere with the project or misrepresent AI-generated material as independently verified work. Do not use a connected agent in a way that violates that agent provider’s rules.",
    ],
  },
  {
    title: "No warranties",
    paragraphs: [
      "To the extent permitted by law, the website and project are provided “as is” and “as available”. The project makes no warranty that the app will be uninterrupted, secure, error-free, compatible with every device, or suitable for a particular purpose.",
    ],
  },
  {
    title: "Liability",
    paragraphs: [
      "To the extent permitted by law, the project maintainers and contributors are not liable for loss of data, lost study time, indirect loss, third-party charges, or harm arising from your use of or inability to use Mneme. Nothing in these terms excludes rights that cannot lawfully be excluded.",
    ],
  },
  {
    title: "Changes and contact",
    paragraphs: [
      "These terms may change as the project evolves. The current version will be published on this page and in the project repository. If you continue to use Mneme after a change takes effect, you accept the updated terms. For a question about these terms, use the issue tracker in the repository where you obtained the project.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="28 September 2026"
      summary={summary}
      sections={sections}
    />
  );
}
