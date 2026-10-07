# Capability Request 35 — Choose the microphone, and avoid Bluetooth headset mics

Source: mneme's recording feature (4 October 2026), following requests
32–34.

## The problem

`desktop.audioRecorder` records from the system's default input. When
Bluetooth headphones (AirPods and the like) are connected, macOS often
makes their microphone the default input. Opening that microphone
switches the headset from its high-quality profile (A2DP) to the
call profile (HFP), which:

- records the voice at narrowband call quality (about 16 kHz, mono,
  heavily compressed) instead of the laptop's much better built-in mic;
- drops what the user hears to call quality for the whole recording,
  so a lecture sounds bad while they listen;
- may lower the quality of what the system-audio tap captures, if the
  output device's format changes. Please verify this.

The user wants the original sound recorded, not the headset's.
Bluetooth headphones are also the best way to record "both" without
echo (request 33), as long as the recording uses the laptop's mic.

## What's asked for

The exact shape is chain-sdk's contract decision (rule 1). Each of the
following is a requirement:

- **List the microphones**: for example `microphones()` returning each
  input's id, name, transport (built-in, Bluetooth, USB, other), whether
  it's the system default, and its sample rate.
- **Choose the microphone per recording**: an option on `start()`, for
  example `microphone?: string` (a device id). Recording from a chosen
  device must not change the system's default input.
- **Avoid Bluetooth headset mics**: an option, for example
  `avoidBluetoothMicrophone?: boolean`. When the chosen or default input
  is Bluetooth, record from the built-in mic instead, so the headset
  stays on its high-quality profile. Fall back to the Bluetooth mic only
  if no other input exists, and say so (next point). The default keeps
  today's behaviour (off) unless you see a reason otherwise; document
  it.
- **Report which microphone is recording**: `start()` resolves with
  (or an event gives) the device actually used: its name, transport and
  sample rate, plus whether it fell back to a Bluetooth mic. Then the
  app can warn the user when quality will be poor.
- **Device changes mid-recording**: headphones that connect or
  disconnect during a lecture must not end or silently degrade the take.
  Keep recording from the chosen device. If it disappears, switch to the
  built-in mic and emit an event saying so. Connecting headphones
  shouldn't move a running recording onto their mic.
- **Echo cancellation and the mixer** (requests 33–34) keep working with
  whichever mic is used.
- **Availability**: report whether choosing a microphone is supported
  here.
- Windows parity (rule 3): the same through WASAPI endpoints (form
  factor or bus type tells Bluetooth apart).

## What mneme will do with it

See `docs/features/recording-sources.md`:

- **Microphone setting** in Settings → General → Recordings:
  **Automatic** (the default: avoid Bluetooth headset mics) or a
  specific microphone from the list.
- **Warning while recording**: if the recording falls back to a
  Bluetooth mic, or the user picked one, the recorder says so. For
  example: "Recording from AirPods’ microphone, at call quality. Use the
  MacBook microphone", with a button to switch.

## Please update in mneme when done

Update mneme's `@chain/sdk` and the capability's CONTRACT.md, then
signal the mneme session.
