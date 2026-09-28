package com.caio.controledefinancas

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts

class WebMainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private var pendingFileChooser: ValueCallback<Array<Uri>>? = null
    private var pendingCsvBytes: ByteArray? = null

    private val openDocument = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        pendingFileChooser?.onReceiveValue(uri?.let { arrayOf(it) })
        pendingFileChooser = null
    }

    private val createCsvDocument = registerForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        val bytes = pendingCsvBytes
        pendingCsvBytes = null
        if (uri == null || bytes == null) return@registerForActivityResult

        runCatching {
            contentResolver.openOutputStream(uri)?.use { output -> output.write(bytes) }
                ?: error("Não foi possível abrir o arquivo para gravação.")
        }.onSuccess {
            Toast.makeText(this, "Planilha salva.", Toast.LENGTH_SHORT).show()
        }.onFailure {
            Toast.makeText(this, "Não foi possível salvar a planilha.", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = true
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (uri.scheme == SERVER_SCHEME && uri.host == SERVER_HOST && uri.port == SERVER_PORT) {
                    return false
                }
                if (uri.scheme == "https") {
                    runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                }
                return true
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams,
            ): Boolean {
                pendingFileChooser?.onReceiveValue(null)
                pendingFileChooser = filePathCallback
                openDocument.launch(arrayOf("text/*", "application/vnd.ms-excel", "application/octet-stream"))
                return true
            }
        }
        webView.addJavascriptInterface(CsvDownloadBridge(), "AndroidCsv")
        setContentView(webView)
        webView.loadUrl(SERVER_URL)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    override fun onDestroy() {
        pendingFileChooser?.onReceiveValue(null)
        pendingFileChooser = null
        webView.removeJavascriptInterface("AndroidCsv")
        webView.destroy()
        super.onDestroy()
    }

    private inner class CsvDownloadBridge {
        @JavascriptInterface
        fun saveCsv(fileName: String, base64Content: String) {
            val decoded = runCatching { Base64.decode(base64Content, Base64.DEFAULT) }.getOrNull()
            if (decoded == null || decoded.size > MAX_CSV_BYTES) {
                runOnUiThread {
                    Toast.makeText(this@WebMainActivity, "Arquivo CSV inválido ou grande demais.", Toast.LENGTH_LONG).show()
                }
                return
            }

            runOnUiThread {
                pendingCsvBytes = decoded
                createCsvDocument.launch(fileName.substringAfterLast('/').ifBlank { "transacoes.csv" })
            }
        }
    }

    companion object {
        private const val SERVER_SCHEME = "http"
        private const val SERVER_HOST = "172.28.4.149"
        private const val SERVER_PORT = 3000
        private const val SERVER_URL = "$SERVER_SCHEME://$SERVER_HOST:$SERVER_PORT/"
        private const val MAX_CSV_BYTES = 10 * 1024 * 1024
    }
}
