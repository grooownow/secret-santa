# Fragment: package-deps

Splice into `package.json`: add these entries to `dependencies`,
`devDependencies`, and `scripts` respectively. Versions pulled from the
current root `package.json` (persistence module was extracted from an app
that already had them installed).

## dependencies

```json
"@auth/core": "^0.41.2",
"@auth/drizzle-adapter": "^1.11.2",
"@electric-sql/pglite": "^0.5.4",
"bcryptjs": "^3.0.3",
"drizzle-orm": "^0.45.2",
"next-auth": "5.0.0-beta.31",
"postgres": "^3.4.9"
```

## devDependencies

```json
"@types/bcryptjs": "^3.0.0",
"drizzle-kit": "^0.31.10"
```

## scripts

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:seed": "tsx scripts/seed.ts",
"db:reset": "rm -rf .pglite && pnpm db:migrate && pnpm db:seed"
```
