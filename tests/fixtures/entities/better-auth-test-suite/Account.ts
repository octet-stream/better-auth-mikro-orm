import {defineEntity, p} from "@mikro-orm/sqlite"
import type {Account as BAAccount} from "better-auth"

import type {EntityShape} from "../../../utils/types.ts"
import {Base} from "./Base.ts"

type DBAccount = Omit<BAAccount, "userId">

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
    password: p.string().nullable()
  } satisfies EntityShape<DBAccount, keyof Base>
})

export class Account extends AccountSchema.class implements DBAccount {}

AccountSchema.setClass(Account)
