import {defineEntity, p} from "@mikro-orm/sqlite"
import {v7} from "uuid"

export const BaseSchema = defineEntity({
  name: "Base",
  abstract: true,
  properties: {
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
})

export abstract class Base extends BaseSchema.class {}

BaseSchema.setClass(Base)
