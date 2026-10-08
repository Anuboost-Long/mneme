<div align="center">

<img src="assets/app-icon.svg" alt="mneme" width="128">

<h1>mneme</h1>

<p><strong>Your course, ready to revise.</strong></p>

<p>
mneme turns course pages, files and lectures into notes, flashcards and quizzes,<br>
all on your Mac.
</p>

<p>
<img src="https://img.shields.io/badge/macOS-12.0%2B-171B24?style=for-the-badge&logo=apple&logoColor=white" alt="macOS 12.0+">
<img src="https://img.shields.io/badge/Apple%20Silicon%20%2B%20Intel-171B24?style=for-the-badge" alt="Apple Silicon and Intel">
<a href="https://github.com/Anuboost-Long/mneme-dist/releases/latest"><img src="https://img.shields.io/badge/Download-Latest%20Release-C5F74F?style=for-the-badge&logo=github&logoColor=171B24" alt="Download"></a>
</p>

</div>

---

## Install

One line in Terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/Anuboost-Long/mneme-dist/main/install.sh | bash
```

Then open it:

```bash
open -a mneme
```

The installer picks the build for your Mac (Apple Silicon or Intel), checks the
download, installs it to `/Applications`, and clears the quarantine flag so
macOS opens it. Run the same line again to update.

<details>
<summary><b>Install somewhere else</b></summary>

<br>

```bash
INSTALL_DIR="$HOME/Applications" bash -c "$(curl -fsSL https://raw.githubusercontent.com/Anuboost-Long/mneme-dist/main/install.sh)"
```

</details>

<details>
<summary><b>Prefer the disk image?</b></summary>

<br>

1. Download from [Releases](https://github.com/Anuboost-Long/mneme-dist/releases/latest):
   `mneme-arm64.dmg` for Apple Silicon (M1 and later), `mneme-x64.dmg` for Intel.
2. Open it and drag **mneme** onto the **Applications** shortcut.
3. Clear the quarantine flag. **Don't skip this step:**

   ```bash
   xattr -dr com.apple.quarantine /Applications/mneme.app
   ```

4. Open mneme from Applications.

</details>

---

## If macOS says the app is "damaged"

> **"mneme" is damaged and can't be opened. You should move it to the Trash.**

**Your download is fine.** Nothing is corrupted.

mneme is signed ad-hoc rather than with an Apple Developer ID certificate. macOS
marks anything downloaded through a browser with a quarantine flag, and for an
ad-hoc signed app it reports that as damage instead of the usual "unidentified
developer" prompt. Clearing the flag fixes it:

```bash
xattr -dr com.apple.quarantine /Applications/mneme.app
```

The one-line installer does this for you, which is why it's the recommended way
to install.

---

## Where your files go

```
~/Library/Application Support/dev.chain.mneme/
```

Courses, notes, recordings and flashcards all live there. Settings → Data → **Save a backup**
saves a copy you can keep anywhere.

<details>
<summary><b>Uninstall</b></summary>

<br>

```bash
rm -rf /Applications/mneme.app
rm -rf ~/Library/Application\ Support/dev.chain.mneme
```

The second line deletes your library. Leave it out to keep your courses for a
later reinstall.

</details>

---

## Requirements

| | |
|---|---|
| **macOS** | 12.0 Monterey or later |
| **Mac** | Apple Silicon or Intel |

---

<div align="center">

<sub>This repository hosts the releases and the installer.<br>
mneme's source code is at <a href="https://github.com/Anuboost-Long/mneme">Anuboost-Long/mneme</a>.</sub>

</div>
