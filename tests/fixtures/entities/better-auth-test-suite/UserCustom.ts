import {defineEntity, p} from "@mikro-orm/sqlite"
import type {User as DatabaseUser} from "better-auth"

import type {EntityShape} from "../../../utils/types.ts"

import {Address} from "./Address.ts"
import {BaseProperties} from "./Base.ts"

export const UserSchema = defineEntity({
  name: "UserCustom",
  properties: {
    ...BaseProperties,

    email_address: p.string(),
    emailVerified: p.boolean(),
    name: p.string(),
    image: p.string().nullable(),
    test: p.string().nullable(),
    address: () => p.embedded(Address).object().nullable(),
    customField: p.string().nullable(),
    numericField: p.integer().nullable(),
    testField: p.string().nullable(),
    cbDefaultValueField: p.string().nullable()
  } satisfies EntityShape<Omit<DatabaseUser, "email">>,
  uniques: [
    {
      properties: "email_address"
    }
  ]
})

export class UserCustom
  extends UserSchema.class
  implements Omit<DatabaseUser, "email"> {}

UserSchema.setClass(UserCustom)
