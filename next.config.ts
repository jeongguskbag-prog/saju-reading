import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lunar-javascript is CommonJS; keep it out of the server bundle.
  // 감정서 PDF를 만드는 서버리스 크롬은 번들에 넣지 않고, 압축된 크롬 파일(bin)을 함수에 함께 싣는다.
  serverExternalPackages: ["lunar-javascript", "@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/deliver": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/reading": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/pay/success": ["./node_modules/@sparticuz/chromium/bin/**"],
    // 키는 경로 패턴(glob)이라 [token]을 그대로 쓰면 맞지 않는다. *로 한 단계를 맞춘다.
    "/r/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/r/*/html": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
