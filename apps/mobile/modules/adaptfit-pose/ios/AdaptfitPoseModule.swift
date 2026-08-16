import ExpoModulesCore

public class AdaptfitPoseModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AdaptfitPose") // keep the name identical to android so js stays shared.

    Function("isAvailable") {
      // ios still uses expo-camera preview. don't claim mediapipe until the view infers.
      return false
    }

    View(AdaptfitPoseView.self) {
      Events("onAngles")
      // accept the same props as android so js doesn't branch per platform.
      Prop("enabled") { (_: AdaptfitPoseView, _: Bool) in }
      Prop("facing") { (_: AdaptfitPoseView, _: String) in }
      Prop("leftLandmarks") { (_: AdaptfitPoseView, _: [Int]) in }
      Prop("rightLandmarks") { (_: AdaptfitPoseView, _: [Int]) in }
    }
  }
}
