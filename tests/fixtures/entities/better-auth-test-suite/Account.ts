import {Entity, Property} from "@mikro-orm/decorators/legacy"
import type {Account as DatabaseAccount} from "better-auth"

import {Base} from "./Base.js"

@Entity()
export class Account extends Base implements Omit<DatabaseAccount, "userId"> {
  @Property({type: "string"})
  accountId!: string

  @Property({type: "string"})
  providerId!: string

  @Property({type: "string", nullable: true})
  accessToken?: string | null | undefined

  @Property({type: "string", nullable: true})
  refreshToken?: string | null | undefined

  @Property({type: "datetime", nullable: true})
  accessTokenExpiresAt?: Date | null | undefined

  @Property({type: "datetime", nullable: true})
  refreshTokenExpiresAt?: Date | null | undefined

  @Property({type: "string", nullable: true})
  scope?: string | null | undefined

  @Property({type: "string", nullable: true})
  idToken?: string | null | undefined

  @Property({type: "string", nullable: true})
  password?: string | null | undefined
}
