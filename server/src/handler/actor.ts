import { domain } from "../config";
import { getActor } from "./ap/api";
import { Context } from "./app";

export const syncActor = async (ctx: Context, url: string) => {
  const { data, error } = await getActor(url);
  if (!data || error) {
    ctx.log.warn(error);
    ctx.throw(400, "Failed to get actor");
  }

  const name = data.name || data.preferredUsername;
  if (!name) {
    ctx.throw(400, "No name for actor");
  }

  await ctx.state.app.actorRepository.save({
    userId: url.startsWith(`https://${domain}`)
      ? name
      : `${name}@${data.url ? new URL(data.url).hostname : ""}`,
    rawData: JSON.stringify(data),
    inboxUrl: data?.inbox,
    name,
    summary: data?.summary,
    url: data?.url,
    publicKeyPem: data?.publicKey?.publicKeyPem,
    iconUrl: data?.icon?.url,
  });
};
