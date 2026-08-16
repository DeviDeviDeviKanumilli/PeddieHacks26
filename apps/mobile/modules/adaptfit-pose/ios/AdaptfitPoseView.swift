import ExpoModulesCore

// placeholder view: no camera pipeline, so nothing to upload.
class AdaptfitPoseView: ExpoView {
  let onAngles = EventDispatcher()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true // preview placeholder; no frames to clip yet.
    // no inference here. ios still uses expo-camera for preview.
    backgroundColor = .black
  }
}
