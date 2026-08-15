import ExpoModulesCore

class AdaptfitPoseView: ExpoView {
  let onAngles = EventDispatcher()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .black
  }
}
