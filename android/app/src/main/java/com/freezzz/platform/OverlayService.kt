package com.freezzz.platform

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import kotlin.math.min

class OverlayService : Service() {
    private lateinit var wm: WindowManager
    private var root: FrameLayout? = null
    private var params: WindowManager.LayoutParams? = null
    private var content: FrameLayout? = null
    private var web: WebView? = null
    private var selected = Mode.LIVE
    private var downX = 0f
    private var downY = 0f
    private var startX = 0
    private var startY = 0

    private enum class Mode { CHAT, LIVE, RADIO }
    private val portal = "https://freezzzgames.github.io/Base/"

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(1001, notification())
        if (Settings.canDrawOverlays(this)) showOverlay()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (Settings.canDrawOverlays(this) && root == null) showOverlay()
        return START_STICKY
    }

    override fun onDestroy() {
        root?.let { runCatching { wm.removeView(it) } }
        root = null
        web?.destroy()
        web = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun showOverlay() {
        if (root != null) return
        wm = getSystemService(WINDOW_SERVICE) as WindowManager
        val density = resources.displayMetrics.density
        val width = min((resources.displayMetrics.widthPixels * .92f).toInt(), (430 * density).toInt())
        val height = min((resources.displayMetrics.heightPixels * .68f).toInt(), (720 * density).toInt())

        val panel = FrameLayout(this).apply { setBackgroundColor(Color.rgb(8, 12, 16)) }
        root = panel
        content = FrameLayout(this)

        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(14, 21, 27))
        }
        panel.addView(column, FrameLayout.LayoutParams(-1, -1))

        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(8), dp(6), dp(6), dp(6))
            setBackgroundColor(Color.rgb(24, 35, 44))
        }
        header.addView(TextView(this).apply {
            text = "FREEzzz"
            textSize = 14f
            setTextColor(Color.WHITE)
        }, LinearLayout.LayoutParams(0, -1, 1f))

        listOf(Mode.CHAT to "CHAT", Mode.LIVE to "LIVE", Mode.RADIO to "RADIO").forEach { (mode, label) ->
            header.addView(Button(this).apply {
                text = label
                textSize = 9f
                setOnClickListener { selectMode(mode) }
            }, LinearLayout.LayoutParams(dp(60), dp(44)))
        }
        header.addView(Button(this).apply {
            text = "×"
            textSize = 20f
            setOnClickListener { stopSelf() }
        }, LinearLayout.LayoutParams(dp(44), dp(44)))
        column.addView(header, LinearLayout.LayoutParams(-1, dp(58)))
        column.addView(content, LinearLayout.LayoutParams(-1, 0, 1f))

        val lp = WindowManager.LayoutParams(
            width,
            height,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = dp(8)
            y = dp(80)
        }
        params = lp

        header.setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downX = event.rawX; downY = event.rawY
                    startX = lp.x; startY = lp.y
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    lp.x = startX + (event.rawX - downX).toInt()
                    lp.y = startY + (event.rawY - downY).toInt()
                    wm.updateViewLayout(panel, lp)
                    true
                }
                else -> true
            }
        }

        wm.addView(panel, lp)
        selectMode(selected)
    }

    private fun selectMode(mode: Mode) {
        selected = mode
        content?.removeAllViews()
        when (mode) {
            Mode.CHAT -> loadWeb("https://web.telegram.org/k/")
            Mode.LIVE -> loadWeb("$portal?freezzzOverlay=live")
            Mode.RADIO -> loadWeb("$portal?freezzzOverlay=radio")
        }
    }

    private fun loadWeb(url: String) {
        web?.let { content?.removeView(it); it.destroy() }
        val view = WebView(this).apply {
            setBackgroundColor(Color.rgb(8, 12, 16))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
            loadUrl(url)
        }
        web = view
        content?.addView(view, FrameLayout.LayoutParams(-1, -1))
    }

    private fun notification(): Notification = NotificationCompat.Builder(this, "freezzz_overlay")
        .setSmallIcon(R.drawable.freezzz_icon)
        .setContentTitle("FREEzzzyPortal")
        .setContentText("CHAT · LIVE · RADIO поверх приложений")
        .setOngoing(true)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .build()

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            getSystemService(NotificationManager::class.java).createNotificationChannel(
                NotificationChannel("freezzz_overlay", getString(R.string.overlay_channel), NotificationManager.IMPORTANCE_LOW)
            )
        }
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
