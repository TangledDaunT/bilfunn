import { designFooter } from "@/lib/design";
import { getCurrentUser } from "@/lib/session";
import { escapeHtml } from "@/lib/public-html";
export default async function Footer() {
  const user = await getCurrentUser();
  const html = user
    ? designFooter.replace(
        '<a href="/logg-inn">Logg inn</a>',
        `<a href="/konto">${escapeHtml(user.email.split("@")[0])}</a>`,
      )
    : designFooter;
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
