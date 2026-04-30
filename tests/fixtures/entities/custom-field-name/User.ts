import {defineEntity, p} from "@mikro-orm/sqlite"

import {BaseProperties} from "../shared/Base.ts"

export const UserSchema = defineEntity({
  name: "User",
  properties: {
    ...BaseProperties,

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
