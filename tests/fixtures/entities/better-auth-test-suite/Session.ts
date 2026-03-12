import {Entity, ManyToOne, Property, Unique} from "@mikro-orm/decorators/legacy"
import type {Session as DatabaseSession} from "better-auth"

import {Base} from "../shared/Base.js"
import {User} from "./User.js"

@Entity()
export class Sessions extends Base implements Omit<DatabaseSession, "userId"> {
  @Property({type: "string"})
  @Unique()
  token!: string

  @Property({type: Date})
  expiresAt!: Date

  @Property({type: "string", nullable: true, default: null})
  ipAddress?: string | null | undefined

  @Property({type: "string", nullable: true, default: null})
  userAgent?: string | null | undefined

  @ManyToOne(() => User)
  user!: User
}
