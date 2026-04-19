import {type Opt, PrimaryKey, Property} from "@mikro-orm/core"

export abstract class Base {
  @PrimaryKey({type: "string"})
  id!: string

  @Property({type: Date})
  createdAt!: Opt<Date>

  @Property({type: Date, onUpdate: () => new Date()})
  updatedAt!: Opt<Date>
}
