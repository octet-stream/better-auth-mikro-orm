import {Collection, type Opt} from "@mikro-orm/core"
import {
  Embedded,
  Entity,
  OneToMany,
  Property,
  Unique
} from "@mikro-orm/decorators/legacy"
import type {User as DatabaseUser} from "better-auth"

import {Base} from "../shared/Base.js"
import {Address} from "./Address.js"
import {Session} from "./Session.js"

@Entity()
export class User extends Base implements DatabaseUser {
  @Property({type: "string"})
  @Unique()
  email!: string

  @Property({type: "boolean"})
  emailVerified: Opt<boolean> = false

  @Property({type: "string"})
  name!: string

  @OneToMany(() => Session, "user")
  sessions = new Collection<Session, this>(this)

  @Embedded(() => Address, {object: true, nullable: true})
  address?: Address
}
