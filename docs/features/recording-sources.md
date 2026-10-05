# Recording sources — microphone, computer audio, or both

## Status — 4 October 2026

**Done.** Built on request 32 (`desktop.audioRecorder`) and run through
the manual test plan in the app. Echo cancellation (request 33,
`docs/chain-sdk-requests/33-recording-echo-cancellation.md`) is built on
chain-sdk's `echoCancellation` option, with the setting and the
headphones hint; noise reduction and voice levelling (request 34) and the
microphone choice (request 35) ship with it.

## Goal

Record what the laptop plays (an online lecture, a video call, a video),
not only the room through the microphone, and choose each time:

- **Microphone:** today's behaviour.
- **Computer audio:** only the sound the computer is playing.
- **Both:** the two mixed into one recording, for example a live lecture
  plus your own spoken notes.

## In scope

- **Source choice** wherever recording starts:
  - Home's Recorder widget: a small choice beside the record button.
  - A page's recording block (`/audio`): the same choice before it
    starts.
  - The choice is remembered between recordings (a setting), and starts
    as Microphone.
  - Computer audio and Both are only shown where the capability reports
    them available.
- **While recording:** the same timer, pause, resume, stop and waveform
  as today, with the source shown ("Recording computer audio").
- **After stopping:** nothing changes. Home's take goes through Save
  recording (an existing page, a new page, or Recordings only); a page's
  block keeps its recording. Transcription and the Recordings screen
  work the same on the file.
- **Permission help:** if access to computer audio is refused, a dialog
  like `MicrophoneAccessDialog` explains where to turn it on in System
  Settings, with Try again.
- **One recording path:** `useAudioRecorder` moves to the native capture
  for all three sources, if chain-sdk supports microphone-only there too.

## Echo when recording both

Without headphones, the microphone picks up the speakers, so "both"
records the lecture twice, a moment apart. chain-sdk cancels it using
the computer audio as the reference (request 33: SpeexDSP, 0.2 s tail,
so speakers lagging more than that, like some Bluetooth ones, aren't
covered). The first 2–4 seconds of computer sound, and a moment after a
volume change, can still let some echo through while it adapts.

- **Headphones hint:** with Microphone and computer chosen, the picker
  says to use headphones, but only while echo cancellation is off or
  not available here.
- **Setting:** Settings → General → Recordings → **Reduce echo when
  recording both**, on by default and saved on this device. Only shown
  where `availability()` reports echo cancellation (macOS 14.2 and
  later; not Windows yet). mneme passes it to `start()` for "both".

## Noise and voice volume

Built on request 34
(`docs/chain-sdk-requests/34-recording-audio-processing-options.md`):
chain-sdk's `noiseSuppression` and `autoGainControl` options on
`start()`, applied to the microphone only.

- **Settings:** next to Reduce echo, **Reduce background noise** and
  **Even out voice volume**, both off by default and saved on this
  device. Each only shows where `availability()` reports it, and applies
  to Microphone and Both.
- **Reduce background noise** removes steady noise (fans, hum, hiss)
  by a fixed 15 dB; typing and clicks stay.
- **Even out voice volume** raises a quiet voice by up to about 18 dB
  in Microphone recordings, and steady noise between phrases with it, so
  its hint suggests pairing it with Reduce background noise. In "both"
  it adds nothing: chain-sdk always levels the mic against the computer
  audio there, only while someone is speaking, so leftover echo is
  never turned up.
- **Checking a take:** run the app with
  `CHAIN_RECORDER_TRACKS_DIR=/some/folder npm run dev` and every take
  also writes the raw, processed and mixed mic and the system audio as
  separate WAV files (a chain-sdk debug aid, not part of the contract).

## Bluetooth headphones

Built on request 35
(`docs/chain-sdk-requests/35-recording-microphone-choice.md`). When
Bluetooth headphones are connected, recording from their mic drops both
the recording and what you hear to call quality (in "both", the
computer audio too, since the take runs at the mic's rate).

- **Microphone setting:** **Automatic** (the default: chain-sdk's
  `avoidBluetoothMicrophone`, so the laptop's mic records instead of a
  headset's) or a specific microphone from `microphones()`, labelled
  with its kind. A chosen microphone that isn't connected falls back to
  Automatic, and the recorder says so.
- **Warning:** while a take records from a Bluetooth mic, the recorder
  says it's at call quality. If the user chose that mic, a button sets
  the next recordings back to Automatic (a running take can't switch
  microphones). If it's the only mic, the warning says so.
- **Mid-take:** connecting headphones never moves the take. If the
  recording mic disconnects, the take carries on with the built-in mic
  and the recorder says which.
- With headphones on and the laptop's mic in use, recording "both" has
  no echo to cancel.

## Sound settings on the recorder

Like Discord's voice settings, the same controls as Settings → General
→ Recordings open from a **Sound settings** button next to the source
picker on the Recordings screen, Home's recorder and a page's recording
block: the microphone, Reduce echo, Reduce background noise and Even out
voice volume. Both places share the saved values and stay in sync
(`useStoredString` tells other components when a saved value changes),
and changes apply from the next recording.

## Explicitly out of scope

- Separate tracks for the microphone and computer audio, or adjusting
  their balance after recording.
- Recording only one app's sound.
- Video or screen recording.

## Manual test plan

1. Play a video, record Computer audio for 30 seconds: the recording
   plays back the video's sound, and the room is silent in it.
2. Record Both while talking over a video: both are audible.
3. Microphone still works as before.
4. Refuse computer-audio access: the help dialog appears, and Try again
   works after allowing it in System Settings.
5. Pause during Both: the paused span is left out.
6. A 2-hour Computer audio recording saves and transcribes.
7. Record Both on the laptop speakers with Reduce echo on: the lecture
   is heard once, and your voice over it stays clear.
8. The same with Reduce echo off: the echo is back, and the headphones
   hint shows under the picker.
9. Record Microphone next to a fan with Reduce background noise on, then
   off: the hum is gone with it on, and the voice sounds natural.
10. Record a voice from across the room with Even out voice volume on,
    then off: it's louder with it on, and the noise stays low when
    Reduce background noise is on too.
11. Connect AirPods and record Microphone with the setting on Automatic:
    the laptop's mic records, and the AirPods keep full sound quality.
12. Choose the AirPods' mic: the recorder warns about call quality, and
    its button switches back to the laptop's mic.
13. Connect or disconnect the AirPods mid-recording: the take carries
    on.
