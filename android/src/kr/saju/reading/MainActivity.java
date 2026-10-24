package kr.saju.reading;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URISyntaxException;
import java.nio.charset.Charset;

/**
 * 천기록 웹사이트(SiteConfig.SITE_URL + SiteConfig.APP_PATH)를 띄운다.
 * 관리자용 앱(천기록 관리, SiteConfig.AUDIENCE = admin)은 앱 전용 화면(/app)을, 사용자용 앱(천기록, user)은 홈페이지(/)를 연다.
 * 사용자용 앱에는 앱 접근 키가 없어(SiteConfig.APP_KEY = "") 결제·로그인으로 쓰고, 관리자 바로가기도 보이지 않는다.
 * 한국어 앱은 /app, 대만·홍콩 번체 앱은 /app/zh, 중국 대륙 간체 앱은 /app/zh-hans (SiteConfig.LANG). 결제 없이 바로 감정서를 받는 화면이다.
 * 사이트를 고치면 앱을 다시 설치하지 않아도 같은 내용이 보인다.
 *
 * - 무료 풀이: 앱에 넣은 접근 키(SiteConfig.APP_KEY)를 AndroidBridge.appKey()로 우리 사이트에만 건넨다.
 * - PDF·HTML 저장: WebView에는 window.print()와 파일 다운로드가 없어 AndroidBridge로 대신한다(우리 사이트에서만).
 * - 카카오톡 상담·메일·전화 링크는 해당 앱으로 연다.
 */
public class MainActivity extends Activity {
    private static final int REQUEST_SAVE_HTML = 1;
    private WebView webView;
    private String siteHost;
    /** 지금 떠 있는 페이지의 호스트. 자바스크립트 브리지(백그라운드 스레드)에서 읽으므로 volatile. */
    private volatile String currentHost;
    /** 저장 위치를 고르는 동안 들고 있는 HTML 내용. */
    private String pendingHtml;

    /** 앱 언어에 맞는 문구(한국어, 번체, 간체). */
    private static String t(String ko, String hant, String hans) {
        if ("zh-Hant".equals(SiteConfig.LANG)) {
            return hant;
        }
        return "zh-Hans".equals(SiteConfig.LANG) ? hans : ko;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        siteHost = Uri.parse(SiteConfig.SITE_URL).getHost();
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        // 결제창이 카드사 페이지를 오가며 쿠키를 쓰므로 제3자 쿠키를 허용한다.
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        webView.setWebViewClient(new SiteClient());
        // WebView는 PDF 같은 파일을 화면에 띄우지 못한다. 파일 링크는 휴대폰 브라우저(또는 PDF 앱)로 넘긴다.
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                if (url != null && url.startsWith("https://")) {
                    openExternal(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                }
            }
        });
        // 웹 화면의 "PDF로 저장", "HTML로 저장" 버튼이 호출한다.
        webView.addJavascriptInterface(new Bridge(), "AndroidBridge");
        setContentView(webView);
        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(SiteConfig.SITE_URL + SiteConfig.APP_PATH);
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

    /** 우리 사이트 주소인지. www가 붙든 안 붙든(www.chungirok.com, chungirok.com) 같은 사이트로 본다. */
    private boolean isSiteHost(String host) {
        return host != null && bareHost(siteHost).equals(bareHost(host));
    }

    private static String bareHost(String host) {
        String h = host == null ? "" : host.toLowerCase();
        return h.startsWith("www.") ? h.substring(4) : h;
    }

    private boolean isOurSite() {
        String url = webView.getUrl();
        return url != null && isSiteHost(Uri.parse(url).getHost());
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
            Toast.makeText(this, t("HTML 파일을 저장했습니다.", "已儲存 HTML 檔案。", "已保存 HTML 文件。"), Toast.LENGTH_SHORT).show();
        } catch (IOException e) {
            Toast.makeText(this, t("저장하지 못했습니다: ", "儲存失敗：", "保存失败：") + e.getMessage(), Toast.LENGTH_LONG).show();
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

    /** 웹 화면이 부르는 기능. 결제창 등 다른 사이트가 떠 있을 때는 아무것도 하지 않는다. */
    private class Bridge {
        /** 앱 전용 화면의 무료 풀이용 접근 키. 우리 사이트가 떠 있을 때만 돌려준다. */
        @JavascriptInterface
        public String appKey() {
            return isSiteHost(currentHost) ? SiteConfig.APP_KEY : "";
        }

        @JavascriptInterface
        public void print(final String jobName) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (isOurSite()) {
                        printPage(jobName == null || jobName.isEmpty() ? t("천기록", "天機錄", "天机录") : jobName);
                    }
                }
            });
        }

        @JavascriptInterface
        public void saveHtml(final String fileName, final String html) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (isOurSite()) {
                        MainActivity.this.saveHtml(fileName == null || fileName.isEmpty() ? t("천기록", "天機錄", "天机录") : fileName, html);
                    }
                }
            });
        }
    }

    private class SiteClient extends WebViewClient {
        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            currentHost = url == null ? null : Uri.parse(url).getHost();
        }

        // API 23에서도 동작하도록 문자열 버전을 쓴다. 24+에서는 기본 구현이 이 메서드를 호출한다.
        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri uri = Uri.parse(url);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
            if (scheme.equals("http") || scheme.equals("https")) {
                // 카카오톡 채널 상담은 카카오톡(또는 브라우저)으로 연다. 나머지(사이트·결제창)는 앱 안에서.
                if (host.endsWith("kakao.com") || host.endsWith("kakao.co.kr")) {
                    return openExternal(new Intent(Intent.ACTION_VIEW, uri));
                }
                return false;
            }
            if (scheme.equals("intent")) {
                return openIntentUrl(url);
            }
            // mailto:, tel:, 카드사·은행 앱 링크(ispmobile:// 등)는 설치된 앱으로 넘긴다.
            return openExternal(new Intent(Intent.ACTION_VIEW, uri));
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                showOffline(view, request.getUrl().toString());
            }
        }
    }

    /** 결제 SDK가 쓰는 intent:// 주소. 앱이 없으면 fallback 주소나 Play 스토어로 보낸다. */
    private boolean openIntentUrl(String url) {
        try {
            Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            intent.setComponent(null);
            intent.setSelector(null);
            try {
                startActivity(intent);
            } catch (ActivityNotFoundException e) {
                String fallback = intent.getStringExtra("browser_fallback_url");
                if (fallback != null) {
                    webView.loadUrl(fallback);
                } else if (intent.getPackage() != null) {
                    openExternal(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + intent.getPackage())));
                }
            }
        } catch (URISyntaxException e) {
            Toast.makeText(this, t("앱을 열 수 없는 주소입니다.", "無法開啟這個連結。", "无法打开这个链接。"), Toast.LENGTH_SHORT).show();
        }
        return true;
    }

    private boolean openExternal(Intent intent) {
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, t("이 링크를 열 수 있는 앱이 없습니다.", "沒有可開啟此連結的 App。", "没有可以打开此链接的应用。"), Toast.LENGTH_SHORT).show();
        }
        return true;
    }

    /** 인터넷이 끊겼을 때 보여 줄 화면. "다시 시도"를 누르면 같은 주소를 다시 연다. */
    private void showOffline(WebView view, String failedUrl) {
        String retry = failedUrl.replace("\"", "%22");
        String html = "<!doctype html><html lang=\"" + SiteConfig.LANG + "\"><head><meta charset=\"utf-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
                + "<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;"
                + "background:#ece9e1;color:#24324f;font-family:sans-serif;text-align:center}"
                + "a{display:inline-block;margin-top:16px;padding:12px 28px;border-radius:12px;background:#24324f;color:#fff;"
                + "text-decoration:none;font-weight:700}@media(prefers-color-scheme:dark){body{background:#22211f;color:#ece9e1}}</style>"
                + "</head><body><div><h2>" + t("인터넷에 연결되어 있지 않습니다", "目前沒有網路連線", "当前没有网络连接") + "</h2>"
                + "<p>" + t("연결을 확인한 뒤 다시 시도해 주세요.", "請確認網路連線後再試一次。", "请检查网络连接后重试。") + "</p><a href=\"" + retry + "\">"
                + t("다시 시도", "重試", "重试") + "</a></div></body></html>";
        view.loadDataWithBaseURL(null, html, "text/html", "UTF-8", failedUrl);
    }
}
