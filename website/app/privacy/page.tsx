import LegalPage from "../components/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy notice" updated="28 September 2026">
      <p className="legal-summary">
        Mneme is an open-source, local-first desktop application. Your course library stays on your
        device unless you deliberately use a feature that sends material to a service or agent you
        chose.
      </p>
      <section>
        <h2>Who this notice covers</h2>
        <p>
          This notice describes the Mneme desktop application and this website. Mneme is an
          open-source project, not a hosted course platform. It does not create a user account,
          operate a central course database, or sell personal information.
        </p>
      </section>
      <section>
        <h2>Information stored by the app</h2>
        <p>
          Mneme stores the content you add or create in its local application database on your
          device. This can include course names and descriptions, pages and highlights, imported
          documents, recordings, transcripts, AI settings, conversation history and message
          attachments.
        </p>
        <p>
          The app also stores device preferences such as theme, reading voice and interface choices
          locally. These are used to make the app work and are not sent to the project maintainers.
        </p>
      </section>
      <section>
        <h2>When information leaves your device</h2>
        <p>
          Mneme only sends content outside your device when you ask it to use a connected service.
          Examples include importing a public course webpage, downloading an optional transcription
          model, or sending a chat message or AI action to an agent connection you configured.
        </p>
        <p>
          For an AI request, the app sends the selected scope: for example, the selected text, page,
          module, course or file attachment you chose. The relevant agent provider or command-line
          tool handles that request under its own terms and privacy policy. Mneme does not control
          those third parties.
        </p>
      </section>
      <section>
        <h2>On-device features</h2>
        <p>
          Where supported, recording, read-aloud, image text recognition and transcription can use
          device capabilities or a model installed on your device. Optional models are downloaded
          only when you select them and can be removed in Settings.
        </p>
      </section>
      <section>
        <h2>This website</h2>
        <p>
          This website is a static project site and does not include an account system, advertising
          tracker or project-operated analytics service. A hosting provider may process technical
          connection information, such as IP address, browser details and request logs, to deliver
          and secure the website. Check the hosting provider’s policy for its handling of that
          information.
        </p>
      </section>
      <section>
        <h2>Security and retention</h2>
        <p>
          Your local data remains on your device until you delete it, remove the application, or use
          an app feature that removes it. You are responsible for protecting your device,
          operating-system account and any backups you create. No security measure can guarantee
          absolute security.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You can choose not to connect an AI agent, decline microphone or speech permissions,
          remove downloaded models, delete local content and uninstall the app. You can inspect the
          source code, which is the most complete description of the project’s data flows.
        </p>
      </section>
      <section>
        <h2>Children</h2>
        <p>
          Mneme is not directed at children. If you are responsible for a child using the app,
          supervise the third-party services and AI connections they choose.
        </p>
      </section>
      <section>
        <h2>Changes and questions</h2>
        <p>
          Changes to this notice will be published in the project repository and on this page with a
          new update date. For questions, corrections or a privacy concern, open an issue in the
          repository where you obtained Mneme. Do not include sensitive personal information in a
          public issue.
        </p>
      </section>
    </LegalPage>
  );
}
