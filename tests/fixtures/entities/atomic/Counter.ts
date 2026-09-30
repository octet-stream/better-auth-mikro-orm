import {defineEntity, p} from "@mikro-orm/sqlite"

import {Base} from "./Base.ts"
import {User} from "./User.ts"

/**
 * A model used to exercise atomic counters. Declared to Better Auth via a test plugin schema.
 */
export const CounterSchema = defineEntity({
  name: "Counter",
  extends: Base,
  properties: {
    label: p.string(),
    value: p.integer().nullable(),
    remaining: p.integer().default(0),
    owner: () => p.manyToOne(User).nullable()
  }
})

export class Counter extends CounterSchema.class {}

CounterSchema.setClass(Counter)
