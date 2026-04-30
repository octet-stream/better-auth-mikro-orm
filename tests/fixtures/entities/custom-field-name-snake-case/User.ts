import {defineEntity, p} from "@mikro-orm/sqlite"

import {BaseProperties} from "../shared/Base.ts"

export const UserSchema = defineEntity({
  name: "User",
  properties: {
    ...BaseProperties,

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
