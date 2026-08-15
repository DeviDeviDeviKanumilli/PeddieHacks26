import ExpoModulesCore

public class AdaptfitPoseModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AdaptfitPose")

    Function("isAvailable") {
      return false
    }

    View(AdaptfitPoseView.self) {
      Events("onAngles")
      Prop("enabled") { (_: AdaptfitPoseView, _: Bool) in }
      Prop("facing") { (_: AdaptfitPoseView, _: String) in }
      Prop("leftLandmarks") { (_: AdaptfitPoseView, _: [Int]) in }
      Prop("rightLandmarks") { (_: AdaptfitPoseView, _: [Int]) in }
    }
  }
}
