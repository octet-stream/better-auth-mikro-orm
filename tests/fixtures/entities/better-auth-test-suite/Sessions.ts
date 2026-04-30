import {defineEntity, p} from "@mikro-orm/sqlite"
import type {Session as DatabaseSession} from "better-auth"

import type {EntityShape} from "../../../utils/types.ts"

import {BaseProperties} from "./Base.ts"
import {User} from "./User.ts"

export const SessionsSchema = defineEntity({
  name: "Sessions",
  properties: {
    ...BaseProperties,

    token: p.string(),
    expiresAt: p.datetime(),
    ipAddress: p.string().nullable(),
    userAgent: p.string().nullable(),
    user: () => p.manyToOne(User)
  } satisfies EntityShape<Omit<DatabaseSession, "userId">>,
  uniques: [
    {
      properties: "token"
    }
  ]
})

export class Sessions
  extends SessionsSchema.class
  implements Omit<DatabaseSession, "userId"> {}

SessionsSchema.setClass(Sessions)
