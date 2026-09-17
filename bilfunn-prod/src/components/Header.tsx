import { designHeader } from "@/lib/design";
export default function Header() {
  return <div dangerouslySetInnerHTML={{ __html: designHeader }} />;
}
