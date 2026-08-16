package expo.modules.adaptfitpose

// frames stay on-device. js only gets left/right angles plus confidence.

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import kotlin.math.acos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min

class AdaptfitPoseView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onAngles by EventDispatcher()
  private val previewView = PreviewView(context).also {
    it.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    it.implementationMode = PreviewView.ImplementationMode.COMPATIBLE
    it.scaleType = PreviewView.ScaleType.FILL_CENTER
    addView(it)
  }

  private var poseLandmarker: PoseLandmarker? = null
  private var analysisExecutor: ExecutorService? = null
  private var cameraProvider: ProcessCameraProvider? = null
  private var trackingEnabled = false
  private var useFrontCamera = true
  // default curl joints until the recipe props arrive.
  private var leftLandmarks = intArrayOf(11, 13, 15)
  private var rightLandmarks = intArrayOf(12, 14, 16)
  private var lastTimestampMs = 0L
  private var bound = false

  fun setTrackingEnabled(enabled: Boolean) {
    trackingEnabled = enabled
    if (enabled) startCamera() else stopCamera()
  }

  fun setFacing(facing: String) {
    val nextFront = facing != "back"
    if (nextFront == useFrontCamera) return
    useFrontCamera = nextFront
    if (trackingEnabled) {
      stopCamera()
      startCamera()
    }
  }

  fun setLeftLandmarks(landmarks: List<Int>?) {
    if (landmarks != null && landmarks.size == 3) {
      leftLandmarks = landmarks.toIntArray()
    }
  }

  fun setRightLandmarks(landmarks: List<Int>?) {
    if (landmarks != null && landmarks.size == 3) {
      rightLandmarks = landmarks.toIntArray()
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (trackingEnabled) startCamera()
  }

  override fun onDetachedFromWindow() {
    // navigation away or background: release the camera session.
    stopCamera()
    super.onDetachedFromWindow()
  }

  private fun startCamera() {
    val activity = appContext.currentActivity as? FragmentActivity ?: return
    if (!trackingEnabled || bound || !isAttachedToWindow) return
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
      != PackageManager.PERMISSION_GRANTED
    ) {
      // permission is requested in js. don't prompt from native.
      return
    }

    if (poseLandmarker == null) {
      poseLandmarker = createLandmarker()
    }
    if (analysisExecutor == null) {
      analysisExecutor = Executors.newSingleThreadExecutor()
    }

    val providerFuture = ProcessCameraProvider.getInstance(context)
    providerFuture.addListener(
      {
        val provider = providerFuture.get()
        cameraProvider = provider
        bindCamera(activity, provider)
      },
      ContextCompat.getMainExecutor(context),
    )
  }

  private fun bindCamera(activity: FragmentActivity, provider: ProcessCameraProvider) {
    if (!trackingEnabled || !isAttachedToWindow) return
    provider.unbindAll()

    val preview = Preview.Builder().build().also {
      it.setSurfaceProvider(previewView.surfaceProvider)
    }
    val analysis = ImageAnalysis.Builder()
      // drop stale frames so we don't queue a backlog off-thread.
      .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
      .build()
      .also { imageAnalysis ->
        val executor = analysisExecutor ?: return
        imageAnalysis.setAnalyzer(executor) { imageProxy ->
          try {
            val landmarker = poseLandmarker ?: return@setAnalyzer
            val bitmap = imageProxy.toBitmap()
            val mpImage = BitmapImageBuilder(bitmap).build()
            val timestamp = max(imageProxy.imageInfo.timestamp, lastTimestampMs + 1)
            lastTimestampMs = timestamp
            landmarker.detectAsync(mpImage, timestamp)
          } catch (error: Exception) {
            Log.w(TAG, "Pose analysis failed", error)
          } finally {
            // close every frame. never persist bitmaps or landmarks.
            imageProxy.close()
          }
        }
      }

    val selector = if (useFrontCamera) {
      CameraSelector.DEFAULT_FRONT_CAMERA
    } else {
      CameraSelector.DEFAULT_BACK_CAMERA
    }
    provider.bindToLifecycle(activity, selector, preview, analysis)
    bound = true
  }

  private fun stopCamera() {
    bound = false
    cameraProvider?.unbindAll()
    analysisExecutor?.shutdown()
    analysisExecutor = null
    poseLandmarker?.close()
    poseLandmarker = null
    lastTimestampMs = 0L
  }

  private fun createLandmarker(): PoseLandmarker? {
    return try {
      val options = PoseLandmarker.PoseLandmarkerOptions.builder()
        .setBaseOptions(
          // baked into the apk at compile time. never download a model at runtime.
          BaseOptions.builder().setModelAssetPath("pose_landmarker_lite.task").build(),
        )
        .setRunningMode(RunningMode.LIVE_STREAM)
        .setNumPoses(1)
        .setMinPoseDetectionConfidence(0.5f)
        .setMinPosePresenceConfidence(0.5f)
        .setMinTrackingConfidence(0.5f)
        .setResultListener { result, image ->
          emitAngles(result, image.width, image.height)
        }
        .setErrorListener { error ->
          Log.w(TAG, "Pose landmarker error", error)
        }
        .build()
      PoseLandmarker.createFromOptions(context, options)
    } catch (error: Exception) {
      Log.e(TAG, "Unable to create pose landmarker", error)
      null
    }
  }

  private fun emitAngles(result: PoseLandmarkerResult, width: Int, height: Int) {
    // landmarks never go over the bridge.
    val pose = result.landmarks().firstOrNull() ?: run {
      onAngles(
        mapOf(
          "leftAngle" to null,
          "rightAngle" to null,
          "confidence" to 0.0,
        ),
      )
      return
    }
    val left = jointAngle(pose, leftLandmarks, width, height)
    val right = jointAngle(pose, rightLandmarks, width, height)
    val visibilities = (leftLandmarks + rightLandmarks).mapNotNull { index ->
      pose.getOrNull(index)?.visibility()?.orElse(0f)
    }
    val confidence = if (visibilities.isEmpty()) 0.0 else visibilities.average()
    onAngles(
      mapOf(
        "leftAngle" to left,
        "rightAngle" to right,
        "confidence" to confidence,
      ),
    )
  }

  private fun jointAngle(
    landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>,
    indices: IntArray,
    width: Int,
    height: Int,
  ): Double? {
    if (indices.size != 3) return null
    val point1 = landmarks.getOrNull(indices[0]) ?: return null
    val vertex = landmarks.getOrNull(indices[1]) ?: return null
    val point2 = landmarks.getOrNull(indices[2]) ?: return null
    val visibilities = listOf(point1, vertex, point2).map { it.visibility().orElse(0f) }
    if (visibilities.any { it < VISIBILITY_THRESHOLD }) return null // occluded joints would invent a fake angle.

    val vector1x = (point1.x() - vertex.x()) * width
    val vector1y = (point1.y() - vertex.y()) * height
    val vector2x = (point2.x() - vertex.x()) * width
    val vector2y = (point2.y() - vertex.y()) * height
    val magnitude = hypot(vector1x.toDouble(), vector1y.toDouble()) *
      hypot(vector2x.toDouble(), vector2y.toDouble())
    if (magnitude == 0.0) return null
    val cosine = min(1.0, max(-1.0, (vector1x * vector2x + vector1y * vector2y) / magnitude))
    return Math.toDegrees(acos(cosine))
  }

  companion object {
    private const val TAG = "AdaptfitPose"
    private const val VISIBILITY_THRESHOLD = 0.5f // below this, skip the angle instead of guessing.
  }
}
