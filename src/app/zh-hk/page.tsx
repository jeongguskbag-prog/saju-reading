import SiteHome, { siteMetadata } from "@/components/SiteHome";

export const metadata = siteMetadata("zh-HK");

export default function Page() {
  return <SiteHome site="zh-HK" />;
}
