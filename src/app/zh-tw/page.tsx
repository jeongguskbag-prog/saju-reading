import SiteHome, { siteMetadata } from "@/components/SiteHome";

export const metadata = siteMetadata("zh-TW");

export default function Page() {
  return <SiteHome site="zh-TW" />;
}
