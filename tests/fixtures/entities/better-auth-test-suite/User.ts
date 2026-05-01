import {defineEntity, p} from "@mikro-orm/sqlite"
import type {User as BAUser} from "better-auth"

import type {EntityShape} from "../../../utils/types.ts"

import {Address} from "./Address.ts"
import {Base} from "./Base.ts"
import {Sessions} from "./Sessions.ts"

type DBUser = Omit<BAUser, "email">

export const UserSchema = defineEntity({
  name: "User",
  extends: Base,
  properties: {
    email_address: p.string(),
    emailVerified: p.boolean(),
    name: p.string(),
    image: p.string().nullable(),
    sessions: () => p.oneToMany(Sessions).mappedBy(session => session.user),
    test: p.string().nullable(),
    address: () => p.embedded(Address).object().nullable(),
    customField: p.string().nullable(),
    numericField: p.integer().nullable(),
    testField: p.string().nullable(),
    cbDefaultValueField: p.string().nullable()
  } satisfies EntityShape<DBUser, keyof Base>,
  uniques: [
    {
      properties: "email_address"
    }
  ]
})

export class User extends UserSchema.class implements DBUser {}

UserSchema.setClass(User)
