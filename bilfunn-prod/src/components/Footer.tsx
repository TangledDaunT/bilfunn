import { designFooter } from "@/lib/design";
export default function Footer() {
  return <div dangerouslySetInnerHTML={{ __html: designFooter }} />;
}
