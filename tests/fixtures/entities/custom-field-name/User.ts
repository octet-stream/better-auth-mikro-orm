import {defineEntity, p} from "@mikro-orm/sqlite"

import {Base} from "../shared/Base.ts"

export const UserSchema = defineEntity({
  name: "User",
  extends: Base,
  properties: {
    emailAddress: p.string(),
    emailVerified: p.boolean().default(false),
    name: p.string()
  },

  uniques: [
    {
      properties: "emailAddress"
    }
  ]
})

export class User extends UserSchema.class {}

UserSchema.setClass(User)
