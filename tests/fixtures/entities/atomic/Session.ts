import {defineEntity, p} from "@mikro-orm/sqlite"

import {Base} from "./Base.ts"
import {User} from "./User.ts"

export const SessionSchema = defineEntity({
  name: "Session",
  extends: Base,
  properties: {
    token: p.string(),
    expiresAt: p.datetime(),
    ipAddress: p.string().nullable(),
    userAgent: p.string().nullable(),
    user: () => p.manyToOne(User)
  },
  uniques: [
    {
      properties: "token"
    }
  ]
})

export class Session extends SessionSchema.class {}

SessionSchema.setClass(Session)
