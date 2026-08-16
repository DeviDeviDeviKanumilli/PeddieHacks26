# Camera Capture Boundary

Camera access is optional. A workout is valid without a preview, without pose inference,
and without any derived form metrics. Permission is requested only after an explicit user
action on the tracking control.

## Ownership

The camera session is owned by the client. Production Android pose uses one native camera
session inside `apps/mobile/modules/adaptfit-pose`. Expo Go cannot open that session. iOS
may show an `expo-camera` preview without running the landmarker.

## Lifetime

Capture starts after permission and setup. It stops on unmount, navigation away from the
active session, pause, completion, or application backgrounding. The client must not keep
a hidden camera after the user leaves the exercise.

## What May Be Read

Native code may read frames solely to run pose inference. Frames are not written to disk,
not copied into JavaScript as images, and not attached to API requests.

## What Must Not Happen

- No upload of video, stills, or audio
- No persistence of frames in SQLite, AsyncStorage, or Supabase Storage
- No second consumer of the camera stream (the pose module owns the session)
- No implied medical monitoring from the presence of a camera
