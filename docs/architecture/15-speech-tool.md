# Speech Tool

`speech.speak` plays a short, pre-approved utterance through the platform speech API.
Spoken feedback is off until the user enables it in accessibility preferences.

## Legal Arguments

- `utteranceId`: identifier into the reviewed phrase table
- `code`: optional `feedbackCodes` value used to select the phrase
- `interrupt`: boolean; default false

## Rules

- Phrases are compiled into the client. They are not fetched as arbitrary text from the
  API
- Maximum duration is bounded; the tool will not speak a paragraph
- `interrupt` is ignored when reduced-motion-equivalent "do not overlap audio" is set
- The tool stops on backgrounding, pause, and screen unmount

## Privacy

Speech synthesis runs on-device. Audio is not recorded, not stored, and not uploaded.
There is no speech-to-text path in this architecture.
