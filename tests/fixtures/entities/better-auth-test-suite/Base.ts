import {p} from "@mikro-orm/sqlite"

import {BaseProperties as BasePropertiesOriginal} from "../shared/Base.ts"

export const BaseProperties = {
  ...BasePropertiesOriginal,

  id: p.string().primary()
}
