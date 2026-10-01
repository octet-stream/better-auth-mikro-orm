import {defineEntity, p} from "@mikro-orm/sqlite"

import {Base} from "./Base.ts"
import {User} from "./User.ts"

export const AccountSchema = defineEntity({
  name: "Account",
  extends: Base,
  properties: {
    accountId: p.string(),
    providerId: p.string(),
    accessToken: p.string().nullable(),
    refreshToken: p.string().nullable(),
    accessTokenExpiresAt: p.datetime().nullable(),
    refreshTokenExpiresAt: p.datetime().nullable(),
    scope: p.string().nullable(),
    idToken: p.string().nullable(),
    password: p.string().nullable(),
    user: () => p.manyToOne(User)
  }
})

export class Account extends AccountSchema.class {}

AccountSchema.setClass(Account)
