package expo.modules.adaptfitpose

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.widget.FrameLayout
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
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
  override val shouldUseAndroidLayout = true

  private val onAngles by EventDispatcher()
  private val cameraContainer = FrameLayout(context).also {
    it.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    addView(it)
  }
  private val previewView = PreviewView(context).also {
    it.layoutParams = FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.MATCH_PARENT,
    )
    it.implementationMode = PreviewView.ImplementationMode.COMPATIBLE
    it.scaleType = PreviewView.ScaleType.FILL_CENTER
    cameraContainer.addView(it)
  }
  private val overlayView = PoseOverlayView(context).also {
    it.layoutParams = FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.MATCH_PARENT,
    )
    cameraContainer.addView(it)
  }

  private var poseLandmarker: PoseLandmarker? = null
  private var analysisExecutor: ExecutorService? = null
  private var cameraProvider: ProcessCameraProvider? = null
  private var previewUseCase: Preview? = null
  private var analysisUseCase: ImageAnalysis? = null
  private var trackingEnabled = false
  private var useFrontCamera = true
  private var leftLandmarks = intArrayOf(11, 13, 15)
  private var rightLandmarks = intArrayOf(12, 14, 16)
  private var leftSecondaryLandmarks = intArrayOf(23, 11, 13)
  private var rightSecondaryLandmarks = intArrayOf(24, 12, 14)
  private var lastTimestampMs = 0L
  private var lastDiagnosticLogMs = 0L
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

  fun setLeftSecondaryLandmarks(landmarks: List<Int>?) {
    if (landmarks != null && landmarks.size == 3) {
      leftSecondaryLandmarks = landmarks.toIntArray()
    }
  }

  fun setRightSecondaryLandmarks(landmarks: List<Int>?) {
    if (landmarks != null && landmarks.size == 3) {
      rightSecondaryLandmarks = landmarks.toIntArray()
    }
  }

  fun setShowOverlay(showOverlay: Boolean) {
    overlayView.visibility = if (showOverlay) View.VISIBLE else View.GONE
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (trackingEnabled) startCamera()
  }

  override fun onDetachedFromWindow() {
    stopCamera()
    super.onDetachedFromWindow()
  }

  private fun startCamera() {
    val activity = appContext.currentActivity as? LifecycleOwner ?: return
    if (!trackingEnabled || bound || !isAttachedToWindow) return
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
      != PackageManager.PERMISSION_GRANTED
    ) {
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

  private fun bindCamera(activity: LifecycleOwner, provider: ProcessCameraProvider) {
    if (!trackingEnabled || !isAttachedToWindow) return
    provider.unbindAll()

    val preview = Preview.Builder().build().also {
      it.setSurfaceProvider(previewView.surfaceProvider)
    }
    val analysis = ImageAnalysis.Builder()
      .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
      .build()
      .also { imageAnalysis ->
        val executor = analysisExecutor ?: return
        imageAnalysis.setAnalyzer(executor) { imageProxy ->
          try {
            val landmarker = poseLandmarker ?: return@setAnalyzer
            val bitmap = rotateBitmap(imageProxy.toBitmap(), imageProxy.imageInfo.rotationDegrees)
            val mpImage = BitmapImageBuilder(bitmap).build()
            val timestamp = max(imageProxy.imageInfo.timestamp / 1_000_000L, lastTimestampMs + 1)
            lastTimestampMs = timestamp
            landmarker.detectAsync(mpImage, timestamp)
          } catch (error: Exception) {
            Log.w(TAG, "Pose analysis failed", error)
          } finally {
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
    previewUseCase = preview
    analysisUseCase = analysis
    bound = true
  }

  private fun stopCamera() {
    bound = false
    previewUseCase?.let { cameraProvider?.unbind(it) }
    analysisUseCase?.let { cameraProvider?.unbind(it) }
    previewUseCase = null
    analysisUseCase = null
    cameraProvider = null
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
    val pose = result.landmarks().firstOrNull() ?: run {
      overlayView.post { overlayView.updatePose(emptyList(), width, height, useFrontCamera) }
      onAngles(mapOf("confidence" to 0.0))
      return
    }
    overlayView.post { overlayView.updatePose(pose, width, height, useFrontCamera) }
    val left = jointAngle(pose, leftLandmarks, width, height)
    val right = jointAngle(pose, rightLandmarks, width, height)
    val leftSecondary = jointAngle(pose, leftSecondaryLandmarks, width, height)
    val rightSecondary = jointAngle(pose, rightSecondaryLandmarks, width, height)
    val leftConfidence = landmarkConfidence(pose, leftLandmarks + leftSecondaryLandmarks)
    val rightConfidence = landmarkConfidence(pose, rightLandmarks + rightSecondaryLandmarks)
    val confidence = max(leftConfidence, rightConfidence)
    val payload = mutableMapOf<String, Any>("confidence" to confidence)
    if (left != null) payload["leftAngle"] = left
    if (right != null) payload["rightAngle"] = right
    if (leftSecondary != null) payload["leftSecondaryAngle"] = leftSecondary
    if (rightSecondary != null) payload["rightSecondaryAngle"] = rightSecondary
    payload["leftConfidence"] = leftConfidence
    payload["rightConfidence"] = rightConfidence
    val diagnosticNow = SystemClock.elapsedRealtime()
    if (BuildConfig.DEBUG && diagnosticNow - lastDiagnosticLogMs >= 500L) {
      lastDiagnosticLogMs = diagnosticNow
      Log.d(
        TAG,
        "angles left=$left right=$right secondaryLeft=$leftSecondary " +
          "secondaryRight=$rightSecondary confidenceLeft=$leftConfidence " +
          "confidenceRight=$rightConfidence",
      )
    }
    onAngles(payload)
  }

  private fun landmarkConfidence(
    landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>,
    indices: IntArray,
  ): Double {
    val visibilities = indices
      .map { index -> landmarks.getOrNull(index)?.visibility()?.orElse(0f) }
      .filterNotNull()
    return if (visibilities.isEmpty()) 0.0 else visibilities.average()
  }

  private fun rotateBitmap(bitmap: Bitmap, rotationDegrees: Int): Bitmap {
    if (rotationDegrees == 0) return bitmap
    val matrix = Matrix().apply { postRotate(rotationDegrees.toFloat()) }
    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
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
    if (visibilities.any { it < VISIBILITY_THRESHOLD }) return null

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
    private const val VISIBILITY_THRESHOLD = 0.5f
  }
}

private class PoseOverlayView(context: Context) : View(context) {
  private data class Point(val x: Float, val y: Float, val visibility: Float)

  private val density = resources.displayMetrics.density
  private val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.argb(220, 214, 207, 255)
    strokeCap = Paint.Cap.ROUND
    strokeWidth = 3f * density
  }
  private val pointPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.rgb(116, 102, 204)
    style = Paint.Style.FILL
  }
  private val pointOutlinePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.WHITE
    style = Paint.Style.STROKE
    strokeWidth = 2f * density
  }
  private var points: List<Point> = emptyList()
  private var sourceWidth = 1
  private var sourceHeight = 1
  private var mirrored = false

  fun updatePose(
    landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>,
    width: Int,
    height: Int,
    mirror: Boolean,
  ) {
    sourceWidth = max(1, width)
    sourceHeight = max(1, height)
    mirrored = mirror
    points = landmarks.map {
      Point(it.x(), it.y(), it.visibility().orElse(0f))
    }
    invalidate()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    if (points.isEmpty() || width == 0 || height == 0) return
    val scale = max(width.toFloat() / sourceWidth, height.toFloat() / sourceHeight)
    val drawnWidth = sourceWidth * scale
    val drawnHeight = sourceHeight * scale
    val offsetX = (width - drawnWidth) / 2f
    val offsetY = (height - drawnHeight) / 2f

    fun screenPoint(index: Int): Pair<Float, Float>? {
      val point = points.getOrNull(index) ?: return null
      if (point.visibility < 0.45f) return null
      val normalizedX = if (mirrored) 1f - point.x else point.x
      return Pair(offsetX + normalizedX * drawnWidth, offsetY + point.y * drawnHeight)
    }

    for ((start, end) in CONNECTIONS) {
      val first = screenPoint(start) ?: continue
      val second = screenPoint(end) ?: continue
      canvas.drawLine(first.first, first.second, second.first, second.second, linePaint)
    }
    for (index in DISPLAY_LANDMARKS) {
      val point = screenPoint(index) ?: continue
      canvas.drawCircle(point.first, point.second, 5f * density, pointPaint)
      canvas.drawCircle(point.first, point.second, 5f * density, pointOutlinePaint)
    }
  }

  companion object {
    private val DISPLAY_LANDMARKS = intArrayOf(
      0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28,
    )
    private val CONNECTIONS = arrayOf(
      11 to 12, 11 to 13, 13 to 15, 12 to 14, 14 to 16,
      11 to 23, 12 to 24, 23 to 24, 23 to 25, 25 to 27,
      24 to 26, 26 to 28,
    )
  }
}
