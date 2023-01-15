import { getInbox } from "./api";
import fs from "fs";
import path from "path";
import { userIdUrl } from "../../config";
import { signedFetcher } from "./signedFetcher";

const privateKeyPemString = fs.readFileSync(
  path.join(__dirname, "../../../../.secrets/private.pem"),
  "utf-8"
);
export const signKey = {
  privateKeyPemString,
  keyId: `${userIdUrl}#main-key`,
};

export const deliveryActivity = async (to: string, activity: object) => {
  const { data: inbox, error: inboxError } = await getInbox(to);
  if (!inbox) {
    return { error: inboxError };
  }

  return await signedFetcher(signKey, inbox, {
    method: "post",
    body: activity,
  });
};
