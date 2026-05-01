import {defineEntity, p} from "@mikro-orm/sqlite"
import type {Verification as BAVerification} from "better-auth"

import type {EntityShape} from "../../../utils/types.ts"

import {Base} from "./Base.ts"

export const VerificationSchema = defineEntity({
  name: "Verification",
  extends: Base,
  properties: {
    identifier: p.string(),
    value: p.string(),
    expiresAt: p.datetime()
  } satisfies EntityShape<BAVerification, keyof Base>
})

export class Verification
  extends VerificationSchema.class
  implements BAVerification {}

VerificationSchema.setClass(Verification)
