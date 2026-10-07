package com.freezzz.platform

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {
    private val portalUrl = "https://freezzzgames.github.io/Base/"
    private lateinit var statusText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        buildHome()
        if (Build.VERSION.SDK_INT >= 33) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 10)
        }
    }

    override fun onResume() {
        super.onResume()
        if (::statusText.isInitialized) updateOverlayState()
    }

    private fun buildHome() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(0xFF080C10.toInt())
            setPadding(dp(16), dp(16), dp(16), dp(16))
        }
        root.addView(TextView(this).apply {
            text = "FREEzzzyPortal"
            textSize = 26f
            setTextColor(0xFFF5F7FA.toInt())
            setPadding(0, dp(8), 0, dp(6))
        })
        root.addView(TextView(this).apply {
            text = "CHAT · LIVE · RADIO"
            textSize = 14f
            setTextColor(0xFF66FCF1.toInt())
            setPadding(0, 0, 0, dp(18))
        })

        val web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = true
            webViewClient = WebViewClient()
            loadUrl(portalUrl)
        }
        root.addView(web, LinearLayout.LayoutParams(-1, 0, 1f))

        statusText = TextView(this).apply {
            textSize = 12f
            setTextColor(0xFF9CAAB5.toInt())
            setPadding(0, dp(10), 0, dp(8))
        }
        root.addView(statusText)

        root.addView(Button(this).apply {
            text = "Включить CHAT / LIVE / RADIO поверх приложений"
            setOnClickListener { enableOverlay() }
        }, LinearLayout.LayoutParams(-1, dp(52)))

        setContentView(root)
        updateOverlayState()
    }

    private fun enableOverlay() {
        if (!Settings.canDrawOverlays(this)) {
            startActivity(Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            ))
            return
        }
        ContextCompat.startForegroundService(this, Intent(this, OverlayService::class.java))
        updateOverlayState()
    }

    private fun updateOverlayState() {
        statusText.text = if (Settings.canDrawOverlays(this)) {
            "Оверлей разрешён. Плавающее окно останется поверх других приложений."
        } else {
            "Оверлей выключен. Android потребует системное разрешение."
        }
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
