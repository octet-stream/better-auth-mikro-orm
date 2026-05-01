import {defineEntity, p} from "@mikro-orm/sqlite"
import type {Session as BASession} from "better-auth"

import type {EntityShape} from "../../../utils/types.ts"

type DBSession = Omit<BASession, "userId">

import {Base} from "./Base.ts"
import {User} from "./User.ts"

export const SessionsSchema = defineEntity({
  name: "Sessions",
  extends: Base,
  properties: {
    token: p.string(),
    expiresAt: p.datetime(),
    ipAddress: p.string().nullable(),
    userAgent: p.string().nullable(),
    user: () => p.manyToOne(User)
  } satisfies EntityShape<DBSession, keyof Base>,
  uniques: [
    {
      properties: "token"
    }
  ]
})

export class Sessions extends SessionsSchema.class implements DBSession {}

SessionsSchema.setClass(Sessions)
