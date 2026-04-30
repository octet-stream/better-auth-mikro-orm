import {defineEntity, p} from "@mikro-orm/sqlite"

import {BaseProperties} from "../shared/Base.ts"

import {Address} from "./Address.ts"
import {Session} from "./Session.ts"

const UserSchema = defineEntity({
  name: "User",
  properties: {
    ...BaseProperties,

    email: p.string(),
    emailVerified: p.boolean().default(false),
    name: p.string(),
    sessions: () => p.oneToMany(Session).mappedBy(session => session.user),
    address: () => p.embedded(Address).nullable()
  },
  uniques: [
    {
      properties: "email"
    }
  ]
})

export class User extends UserSchema.class {}

UserSchema.setClass(User)
