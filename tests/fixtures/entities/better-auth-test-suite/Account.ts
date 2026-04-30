import {defineEntity, p} from "@mikro-orm/sqlite"
import type {Account as DatabaseAccount} from "better-auth"

import type {EntityShape} from "../../../utils/types.ts"
import {BaseProperties} from "./Base.ts"

export const AccountSchema = defineEntity({
  name: "Account",
  properties: {
    ...BaseProperties,

    accountId: p.string(),
    providerId: p.string(),
    accessToken: p.string().nullable(),
    refreshToken: p.string().nullable(),
    accessTokenExpiresAt: p.datetime().nullable(),
    refreshTokenExpiresAt: p.datetime().nullable(),
    scope: p.string().nullable(),
    idToken: p.string().nullable(),
    password: p.string().nullable()
  } satisfies EntityShape<Omit<DatabaseAccount, "userId">>
})

export class Account
  extends AccountSchema.class
  implements Omit<DatabaseAccount, "userId"> {}

AccountSchema.setClass(Account)
