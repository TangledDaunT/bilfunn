import { dangerouslyDeleteByTag } from "@vercel/functions";
export async function purgePublic(tags: string[]) {
  if (process.env.VERCEL === "1")
    await dangerouslyDeleteByTag(tags, { revalidationDeadlineSeconds: 0 });
}
