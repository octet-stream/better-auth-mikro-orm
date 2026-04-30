import {defineEntity, p} from "@mikro-orm/sqlite"
import type {Verification as DatabaseVerification} from "better-auth"

import type {EntityShape} from "../../../utils/types.ts"

import {BaseProperties} from "./Base.ts"

export const VerificationSchema = defineEntity({
  name: "Verification",
  properties: {
    ...BaseProperties,

    identifier: p.string(),
    value: p.string(),
    expiresAt: p.datetime()
  } satisfies EntityShape<DatabaseVerification>
})

export class Verification
  extends VerificationSchema.class
  implements DatabaseVerification {}

VerificationSchema.setClass(Verification)
