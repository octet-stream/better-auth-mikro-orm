import {defineEntity, p} from "@mikro-orm/sqlite"

import {Base} from "../shared/Base.ts"

export const CustomUserSchema = defineEntity({
  name: "CustomUser",
  extends: Base,
  properties: {
    email: p.string(),
    emailVerified: p.boolean().default(false),
    name: p.string()
  }
})

export class CustomUser extends CustomUserSchema.class {}

CustomUserSchema.setClass(CustomUser)
