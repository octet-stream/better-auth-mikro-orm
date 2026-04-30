import type {Opt} from "@mikro-orm/core"
import {PrimaryKey, Property} from "@mikro-orm/decorators/legacy"
import {p} from "@mikro-orm/sqlite"
import {v7} from "uuid"

export const BaseProperties = {
  id: p
    .uuid()
    .primary()
    .onCreate(() => v7()),
  createdAt: p.datetime().onCreate(() => new Date()),
  updatedAt: p
    .datetime()
    .onCreate(() => new Date())
    .onUpdate(() => new Date())
}

export abstract class Base {
  @PrimaryKey({type: "string"})
  id: string = v7()

  @Property({type: Date})
  createdAt: Opt<Date> = new Date()

  @Property({type: Date, onUpdate: () => new Date()})
  updatedAt: Opt<Date> = new Date()
}
