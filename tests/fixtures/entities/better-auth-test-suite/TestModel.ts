import {Entity, JsonType, Property} from "@mikro-orm/better-sqlite"
import {Base} from "../shared/Base.js"

@Entity()
export class TestModel extends Base {
  @Property({type: JsonType})
  stringArray!: string[]

  @Property({type: JsonType})
  numberArray!: number[]
}
