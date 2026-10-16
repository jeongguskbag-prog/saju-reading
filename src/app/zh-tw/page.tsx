import LocaleHome, { localeMetadata } from "@/components/LocaleHome";

export const metadata = localeMetadata("zh-TW");

export default function Page() {
  return <LocaleHome locale="zh-TW" />;
}
