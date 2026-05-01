import {defineEntity, p} from "@mikro-orm/sqlite"

import {Base as BaseShared} from "../shared/Base.ts"

export const BaseSchema = defineEntity({
  name: "Base",
  abstract: true,
  extends: BaseShared,
  properties: {
    id: p.string().primary()
  }
})

export abstract class Base extends BaseSchema.class {}

BaseSchema.setClass(Base)
