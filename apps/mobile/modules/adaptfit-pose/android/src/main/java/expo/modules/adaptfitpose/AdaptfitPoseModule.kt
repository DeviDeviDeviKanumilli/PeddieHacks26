package expo.modules.adaptfitpose

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AdaptfitPoseModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AdaptfitPose")

    Function("isAvailable") {
      true
    }

    View(AdaptfitPoseView::class) {
      Events("onAngles")

      Prop("enabled") { view: AdaptfitPoseView, enabled: Boolean? ->
        view.setTrackingEnabled(enabled ?: false)
      }

      Prop("facing") { view: AdaptfitPoseView, facing: String? ->
        view.setFacing(facing ?: "front")
      }

      Prop("leftLandmarks") { view: AdaptfitPoseView, landmarks: List<Int>? ->
        view.setLeftLandmarks(landmarks)
      }

      Prop("rightLandmarks") { view: AdaptfitPoseView, landmarks: List<Int>? ->
        view.setRightLandmarks(landmarks)
      }
    }
  }
}
