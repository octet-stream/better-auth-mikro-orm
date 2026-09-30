import {defineEntity, p} from "@mikro-orm/sqlite"

import {Base} from "./Base.ts"

export const UserSchema = defineEntity({
  name: "User",
  extends: Base,
  properties: {
    email: p.string(),
    emailVerified: p.boolean().default(false),
    name: p.string(),
    image: p.string().nullable()
  },
  uniques: [
    {
      properties: "email"
    }
  ]
})

export class User extends UserSchema.class {}

UserSchema.setClass(User)
