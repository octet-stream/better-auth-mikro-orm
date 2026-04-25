import {Collection, type Opt} from "@mikro-orm/core"
import {
  Embedded,
  Entity,
  OneToMany,
  Property,
  Unique
} from "@mikro-orm/decorators/legacy"
import type {User as DatabaseUser} from "better-auth"

import {Address} from "./Address.js"
import {Base} from "./Base.js"
import {Sessions} from "./Session.js"

@Entity()
export class User extends Base implements Omit<DatabaseUser, "email"> {
  @Property({type: "string"})
  @Unique()
  email_address!: string

  @Property({type: "boolean"})
  emailVerified: Opt<boolean> = false

  @Property({type: "string", nullable: true})
  test?: string

  @Property({type: "string"})
  name!: string

  @Property({type: "string", nullable: true})
  image?: string | null | undefined

  @OneToMany(() => Sessions, "user")
  sessions = new Collection<Sessions, this>(this)

  @Embedded(() => Address, {object: true, nullable: true})
  address?: Address

  @Property({type: "string", nullable: true})
  customField?: string

  @Property({type: "number", nullable: true})
  numericField!: number | undefined | null

  @Property({type: "string", nullable: true})
  testField?: string

  @Property({type: "string", nullable: true})
  cbDefaultValueField?: string
}
