import {Embedded, Entity, type Opt, Property, Unique} from "@mikro-orm/core"
import type {User as DatabaseUser} from "better-auth"

import {Address} from "./Address.js"
import {Base} from "./Base.js"

@Entity()
export class UserCustom extends Base implements Omit<DatabaseUser, "email"> {
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
