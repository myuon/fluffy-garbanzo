import { Context } from "koa";
import { schemaForType } from "../helper/zod";
import { CreateNoteRequest } from "@/shared/request/note";
import { z } from "zod";
import { App } from "./app";
import { ulid } from "ulid";
import { domain, userId, userName } from "../config";

export const createNote = async (app: App, ctx: Context) => {
  const schema = schemaForType<CreateNoteRequest>()(
    z.object({
      content: z.string(),
    })
  );
  const result = schema.safeParse(ctx.request.body);
  if (!result.success) {
    ctx.throw(400, result.error);
  }

  if (ctx.state.auth.uid !== userId) {
    ctx.throw(401, "Unauthorized");
  }

  const note = {
    id: ulid(),
    userId: `https://${domain}/u/${userName}`,
    content: result.data.content,
    createdAt: Date.now(),
  };
  await app.noteRepository.create(note);

  ctx.status = 201;
};
