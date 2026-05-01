import {defineEntity, p} from "@mikro-orm/sqlite"

import {Base} from "../shared/Base.ts"

export const UserSchema = defineEntity({
  name: "User",
  extends: Base,
  properties: {
    email_address: p.string(),
    emailVerified: p.boolean().default(false),
    name: p.string()
  },
  uniques: [
    {
      properties: "email_address"
    }
  ]
})

export class User extends UserSchema.class {}

UserSchema.setClass(User)
