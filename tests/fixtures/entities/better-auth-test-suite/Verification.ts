import {Entity, Property} from "@mikro-orm/decorators/legacy"
import type {Verification as DatabaseVerification} from "better-auth"

import {Base} from "./Base.js"

@Entity()
export class Verification extends Base implements DatabaseVerification {
  @Property({type: "string"})
  identifier!: string

  @Property({type: "string"})
  value!: string

  @Property({type: "datetime"})
  expiresAt!: Date
}
