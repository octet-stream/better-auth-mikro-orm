import {defineEntity, p} from "@mikro-orm/sqlite"

import {Base} from "./Base.ts"

export const VerificationSchema = defineEntity({
  name: "Verification",
  extends: Base,
  properties: {
    identifier: p.string(),
    value: p.string(),
    expiresAt: p.datetime()
  }
})

export class Verification extends VerificationSchema.class {}

VerificationSchema.setClass(Verification)
