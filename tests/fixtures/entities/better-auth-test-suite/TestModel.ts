import {Entity, PrimaryKey, Property} from "@mikro-orm/decorators/legacy"
import {JsonType} from "@mikro-orm/sqlite"

@Entity()
export class TestModel {
  @PrimaryKey({type: "string"})
  id!: string

  @Property({type: JsonType, nullable: true})
  stringArray?: string[]

  @Property({type: JsonType, nullable: true})
  numberArray?: number[]

  @Property({type: "string", nullable: true})
  testField?: string

  @Property({type: "string", nullable: true})
  cbDefaultValueField?: string
}
