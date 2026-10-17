import SiteHome, { siteMetadata } from "@/components/SiteHome";

export const metadata = siteMetadata("en");

export default function Page() {
  return <SiteHome site="en" />;
}
