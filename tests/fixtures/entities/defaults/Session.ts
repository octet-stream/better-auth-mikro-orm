import {defineEntity, p} from "@mikro-orm/sqlite"

import {BaseProperties} from "../shared/Base.ts"
import {User} from "./User.ts"

export const SessionSchema = defineEntity({
  name: "Session",
  properties: {
    ...BaseProperties,

    token: p.string(),
    expiresAt: p.datetime(),
    ipAddress: p.string().nullable(),
    userAgent: p.string().nullable(),

    user: () => p.manyToOne(User)
  }
})

export class Session extends SessionSchema.class {}

SessionSchema.setClass(Session)
