import { Column, Entity, PrimaryColumn, Repository, Unique } from "typeorm";
import { Note } from "@/shared/model/note";

@Entity()
@Unique(["federatedId"])
export class NoteTable {
  @PrimaryColumn({ length: 100 })
  id: string;

  @Column()
  userId: string;

  @Column()
  content: string;

  @Column()
  createdAt: number;

  @Column({ nullable: true })
  federatedId?: string;

  static fromModel(note: Note): NoteTable {
    const noteTable = new NoteTable();
    noteTable.id = note.id;
    noteTable.federatedId = note.federatedId;
    noteTable.userId = note.userId;
    noteTable.content = note.content;
    noteTable.createdAt = note.createdAt;
    return noteTable;
  }

  toModel(): Note {
    return {
      id: this.id,
      userId: this.userId,
      content: this.content,
      createdAt: this.createdAt,
      federatedId: this.federatedId,
    };
  }
}

export const newNoteRepository = (repo: Repository<NoteTable>) => {
  return {
    create: async (note: Note) => {
      const noteTable = NoteTable.fromModel(note);
      await repo.insert(noteTable);
    },
    findLatest: async (
      userId: string,
      pagination: {
        page: number;
        perPage: number;
      }
    ) => {
      const records = await repo.find({
        where: { userId },
        order: { createdAt: "DESC" },
        skip: pagination.page * pagination.perPage,
        take: pagination.perPage,
      });
      return records.map((record) => record.toModel());
    },
    findCount: async (userId: string) => {
      return await repo.count({ where: { userId } });
    },
    findById: async (id: string) => {
      const record = await repo.findOneBy({ id });
      if (record === null) {
        return undefined;
      }
      return record.toModel();
    },
    save: async (note: Note) => {
      const noteTable = NoteTable.fromModel(note);
      await repo.save(noteTable);
    },
    delete: async (id: string) => {
      await repo.delete({ id });
    },
  };
};
export type NoteRepository = ReturnType<typeof newNoteRepository>;
