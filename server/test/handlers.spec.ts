import assert from "assert";
import supertest from "supertest";
import { newApp } from "../src/app";
import { DataSource } from "typeorm";
import { entities } from "../src/infra/db";
import { domain, userFirebaseId, userId, userIdUrl } from "../src/config";
import { Middleware } from "koa";
import { NoteTable, newNoteRepository } from "../src/infra/noteRepository";
import {
  FollowRelationTable,
  newFollowRelationRepository,
} from "../src/infra/followRelationRepository";
import { ActorTable, newActorRepository } from "../src/infra/actorRepository";
import {
  InboxItemTable,
  newInboxItemRepository,
} from "../src/infra/inboxRepository";
import { newShareRepository, ShareTable } from "../src/infra/shareRepository";
import { Activity } from "../../shared/model/activity";

const dataSource = new DataSource({
  type: "sqlite",
  database: ":memory:",
  entities,
  logging: true,
  synchronize: true,
});

const authMiddleware: Middleware = (ctx, next) => {
  if (ctx.request.headers.authorization === "Bearer test_token") {
    ctx.state.auth = {
      uid: userFirebaseId,
      sub: userFirebaseId,
    };
  }

  return next();
};

let delivered: { to: string; activity: Activity }[] = [];

const appContext = {
  noteRepository: newNoteRepository(dataSource.getRepository(NoteTable)),
  followRelationRepository: newFollowRelationRepository(
    dataSource.getRepository(FollowRelationTable)
  ),
  actorRepository: newActorRepository(dataSource.getRepository(ActorTable)),
  inboxItemRepository: newInboxItemRepository(
    dataSource.getRepository(InboxItemTable)
  ),
  shareRepository: newShareRepository(dataSource.getRepository(ShareTable)),
  deliveryClient: {
    deliveryActivity: async (to: string, activity: Activity) => {
      delivered.push({ to, activity });

      return { data: undefined };
    },
  },
};

const app = newApp(authMiddleware, appContext);
const server = app.listen(Math.floor(Math.random() * 10000));
const request = supertest(server);

describe("api", () => {
  before(async () => {
    await dataSource.initialize();
    await request.get("/manifest.json");
  });

  after(async () => {
    server.close();
    await dataSource.destroy();
  });

  it("/.well-known/nodeinfo", async () => {
    await request
      .get("/.well-known/nodeinfo")
      .timeout(10000)
      .expect(200, {
        links: [
          {
            rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
            href: `https://${domain}/nodeinfo/2.1`,
          },
        ],
      });
  });

  describe("deliver to followers", () => {
    before(async () => {
      await appContext.actorRepository.save({
        userId: "test@example.com",
        name: "test",
        inboxUrl: "https://example.com/inbox",
        summary: "",
        url: "https://example.com",
      });
      await appContext.followRelationRepository.create({
        userId: "test@example.com",
        targetUserId: userId,
        createdAt: 0,
      });
    });

    it("POST /api/note", async () => {
      delivered = [];

      await request
        .post("/api/note")
        .set("Authorization", "Bearer test_token")
        .send({
          content: "Hello, World!",
        })
        .expect(201);

      assert.equal(delivered.length, 1);
      assert.equal(delivered[0].to, "https://example.com/inbox");
      assert.equal(delivered[0].activity.type, "Create");
      assert.match(
        (delivered[0].activity as any).id,
        new RegExp(`^${userIdUrl}/s/(.*)/activity$`)
      );
      assert.equal(
        (delivered[0].activity.object as any).content,
        "<p>Hello, World!</p>"
      );
    });
  });
});
