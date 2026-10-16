import LocaleHome, { localeMetadata } from "@/components/LocaleHome";

export const metadata = localeMetadata("zh-HK");

export default function Page() {
  return <LocaleHome locale="zh-HK" />;
}
