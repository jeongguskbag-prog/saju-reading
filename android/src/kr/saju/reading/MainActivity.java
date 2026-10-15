package kr.saju.reading;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.content.Context;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import android.widget.Toast;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.Charset;

/**
 * 앱에 묶인 웹 화면(assets/www)을 https://appassets.androidplatform.net 출처로 띄운다.
 * file:// 대신 https 출처를 쓰면 원격 API 호출 시 일반 CORS 규칙을 그대로 쓸 수 있다.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final int REQUEST_SAVE_HTML = 1;
    private WebView webView;
    /** 저장 위치를 고르는 동안 들고 있는 HTML 내용. */
    private String pendingHtml;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        webView.setWebViewClient(new AssetClient());
        // 웹 화면의 "PDF로 저장" 버튼이 호출한다. 앱에 묶인 화면만 띄우므로 외부 페이지는 이 객체를 볼 수 없다.
        webView.addJavascriptInterface(new Bridge(), "AndroidBridge");
        setContentView(webView);
        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl("https://" + HOST + "/index.html");
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    /** 현재 화면을 시스템 인쇄 창으로 보낸다. 인쇄 창에서 "PDF로 저장"을 고르면 PDF 파일이 된다. */
    private void printPage(String jobName) {
        PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
        PrintAttributes attributes = new PrintAttributes.Builder()
                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                .build();
        printManager.print(jobName, webView.createPrintDocumentAdapter(jobName), attributes);
    }

    /** 시스템 '파일 저장' 화면을 열어 사용자가 고른 위치에 HTML을 저장한다(권한 불필요). */
    private void saveHtml(String fileName, String html) {
        pendingHtml = html;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("text/html");
        intent.putExtra(Intent.EXTRA_TITLE, fileName + ".html");
        startActivityForResult(intent, REQUEST_SAVE_HTML);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_SAVE_HTML) {
            return;
        }
        String html = pendingHtml;
        pendingHtml = null;
        if (resultCode != RESULT_OK || data == null || data.getData() == null || html == null) {
            return;
        }
        OutputStream out = null;
        try {
            out = getContentResolver().openOutputStream(data.getData());
            out.write(html.getBytes(Charset.forName("UTF-8")));
            Toast.makeText(this, "HTML 파일을 저장했습니다.", Toast.LENGTH_SHORT).show();
        } catch (IOException e) {
            Toast.makeText(this, "저장하지 못했습니다: " + e.getMessage(), Toast.LENGTH_LONG).show();
        } finally {
            if (out != null) {
                try {
                    out.close();
                } catch (IOException ignored) {
                    // 닫기 실패는 무시한다.
                }
            }
        }
    }

    private class Bridge {
        @JavascriptInterface
        public void saveHtml(final String fileName, final String html) {
            final String name = (fileName == null || fileName.isEmpty()) ? "사주풀이" : fileName;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    MainActivity.this.saveHtml(name, html);
                }
            });
        }

        @JavascriptInterface
        public void print(final String jobName) {
            final String name = (jobName == null || jobName.isEmpty()) ? "사주풀이" : jobName;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    printPage(name);
                }
            });
        }
    }

    private class AssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!HOST.equals(uri.getHost())) {
                return null;
            }
            String path = uri.getPath();
            if (path == null || path.equals("/")) {
                path = "/index.html";
            }
            try {
                InputStream in = getAssets().open("www" + path);
                return new WebResourceResponse(mimeType(path), "UTF-8", in);
            } catch (IOException e) {
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, null);
            }
        }

        // API 23에서도 동작하도록 문자열 버전을 쓴다. 24+에서는 기본 구현이 이 메서드를 호출한다.
        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri uri = Uri.parse(url);
            if (HOST.equals(uri.getHost())) {
                return false;
            }
            // 외부 링크는 브라우저로 연다.
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
            return true;
        }
    }

    private static String mimeType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }
}
