---
"better-auth-mikro-orm": minor
---

Support Better Auth v1.7: implement native atomic `consumeOne` and `incrementOne` adapter methods (row-locked transaction with a guarded `DELETE`/`UPDATE`, increments computed in SQL, `increment` and `set` applied in one statement), keep the Identity Map in sync after both, and pass `null` through for nullable reference fields instead of creating a reference to `null`.
