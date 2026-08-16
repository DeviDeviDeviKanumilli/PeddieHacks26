package expo.modules.adaptfitpose

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AdaptfitPoseModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AdaptfitPose") // module name must match the js native-module string.

    Function("isAvailable") {
      // android custom builds ship mediapipe. expo go never loads this module.
      true
    }

    View(AdaptfitPoseView::class) {
      Events("onAngles") // derived angles + confidence only.

      Prop("enabled") { view: AdaptfitPoseView, enabled: Boolean? ->
        view.setTrackingEnabled(enabled ?: false)
      }

      Prop("facing") { view: AdaptfitPoseView, facing: String? ->
        view.setFacing(facing ?: "front")
      }

      Prop("leftLandmarks") { view: AdaptfitPoseView, landmarks: List<Int>? ->
        // joint indices for the angle triple, not a pose dump to js.
        view.setLeftLandmarks(landmarks)
      }

      Prop("rightLandmarks") { view: AdaptfitPoseView, landmarks: List<Int>? ->
        view.setRightLandmarks(landmarks)
      }
    }
  }
}
