import type {Opt} from "@mikro-orm/core"
import {PrimaryKey, Property} from "@mikro-orm/decorators/legacy"

export abstract class Base {
  @PrimaryKey({type: "string"})
  id!: string

  @Property({type: Date})
  createdAt!: Opt<Date>

  @Property({type: Date, onUpdate: () => new Date()})
  updatedAt!: Opt<Date>
}
