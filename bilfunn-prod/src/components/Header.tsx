import { designHeader } from "@/lib/design";
import { getCurrentUser } from "@/lib/session";
import { escapeHtml } from "@/lib/public-html";
export default async function Header() {
  const user = await getCurrentUser();
  const html = user
    ? designHeader
        .replace('href="/logg-inn"', 'href="/konto"')
        .replace("Logg inn</a>", `${escapeHtml(user.email.split("@")[0])}</a>`)
    : designHeader;
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
