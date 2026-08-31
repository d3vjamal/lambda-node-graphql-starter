# create-lambda-graphql-app — Technical Documentation

## Overview

`create-lambda-graphql-app` is a Node.js CLI tool that scaffolds production-ready AWS AppSync + Lambda + SAM projects. It generates a fully wired project structure, GraphQL schema, SAM template, and per-handler boilerplate — either from scratch or incrementally added to an existing project.

Published on npm as `create-lambda-graphql-app` (v1.0.3), invoked via:

```bash
npx create-lambda-graphql-app
npx create-lambda-graphql-app add <handler-name>
```

---

## Tech Stack

### CLI Tool (this package)

| Concern | Library | Version |
|---|---|---|
| CLI framework | `commander` | ^14.0.2 |
| Interactive prompts | `inquirer` | ^9.2.12 |
| Terminal colour output | `chalk` | ^5.3.0 |
| File system operations | `fs-extra` | ^11.2.0 |
| Template string indentation | `dedent` | ^1.7.0 |
| Module system | ES Modules (`"type": "module"`) | — |
| Node.js runtime | Node.js 20.x | — |

### Generated Project (scaffolded output)

| Concern | Library / Tool | Version |
|---|---|---|
| Payload validation | `joi` + `@joi/date` | ^17.13.3 / ^2.1.1 |
| Date handling | `moment` | ^2.29.4 |
| Unique IDs | `uuid` | ^8.3.2 |
| AWS DynamoDB SDK v3 | `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/util-dynamodb` | ^3.637.0 / ^3.682.0 |
| AWS S3 SDK v3 | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | ^3.637.0 |
| AWS SDK v2 (legacy) | `aws-sdk` | ^2.1691.0 |
| Linting | `eslint`, `@eslint/js`, `@eslint/eslintrc` | ^8.52.0 |
| Testing | `jest`, `mocha`, `chai`, `c8` (coverage) | ^29.7.0 / ^10.2.0 / ^5.1.1 / ^8.0.1 |
| Serverless deployment | AWS SAM CLI | — |
| Lambda runtime | Node.js 20.x (arm64) | — |
| GraphQL API | AWS AppSync | — |
| Tracing | AWS X-Ray (active tracing enabled) | — |

---

## Repository Structure

```
lambda-node-graphql-starter/
├── bin/
│   └── cli.js                  # Entry point — registers CLI commands
├── lib/
│   ├── commands/
│   │   ├── scaffold-project.js # "new project" command logic
│   │   ├── add-handler.js      # "add handler" command logic
│   │   └── create-handler.js   # shared handler folder creation
│   ├── templates.js            # all file content templates (TEMPLATES object)
│   ├── schemaTemplate.js       # base GraphQL schema builder
│   └── yamlTemplate.js         # SAM template.yaml builder
├── template/
│   ├── .gitignore
│   └── .npmignore
├── package.json
└── README.md
```

---

## CLI Commands

### Default — Scaffold a New Project

```bash
npx create-lambda-graphql-app
# or
npx create-lambda-graphql-app <project-name>
```

Triggers `scaffoldProject()`. Interactively asks:

1. **Project name** — kebab-case, validated with `/^[a-z0-9-]+$/`
2. **Organization name** — used throughout the SAM template (default: `your-org`)
3. **Handler name(s)** — loops until the user stops adding handlers

Exits with an error if the target folder already exists.

### `add` — Extend an Existing Project

```bash
npx create-lambda-graphql-app add <handler-name>
```

Must be run from inside a project folder that has both `template.yaml` and `schema/schema.graphql`. Validates presence of both files before proceeding.

---

## Core Modules

### `bin/cli.js`

The executable entry point. Uses `commander` to define two commands:

- Default action → calls `scaffoldProject()`
- `add <handlerName>` → calls `addHandler(root, handlerName)` with `process.cwd()` as root

### `lib/commands/scaffold-project.js`

Orchestrates full project creation:

1. Prompts for project name and org name
2. Creates root directories: `handlers`, `layers`, `local-test`, `mapping`, `node_modules`, `schema`, `.vscode`
3. Writes root config files: `.gitignore`, `.npmignore`, `.env`, `eslint.config.mjs`, `package.json`, `.vscode/launch.json`, `mapping/request.vtl`, `mapping/response.vtl`
4. Loops through handler creation (calling `createHandler` for each)
5. Renders `template.yaml` from `yamlTemplate` using string replacement for `{{orgName}}`, `{{name}}`, and a `{{#each handlers}}` block
6. Builds `schema/schema.graphql` dynamically — handlers prefixed with `get-` become Queries, all others become Mutations

**Schema generation logic:**
- Starts with `getBaseSchema()` (schema root, empty Query/Mutation types, `ResponseDetail` type)
- For each query handler: generates `Input*`, `*Response` (with `incidents`/`totalCount` fields), and a field with `@aws_api_key @aws_lambda @aws_oidc` directives
- For each mutation handler: generates `Input*`, `*Response` (with `data: AWSJSON` field), and a field with the same auth directives
- Sections are labelled with comments: `# ── Queries ──`, `# ── Mutations ──`, `# ── Input Types ──`, `# ── Response Types ──`

**Name conversion:** `kebab-case` → `camelCase` via `pascalCase()` (first word lowercase, rest capitalised). Full PascalCase via `capitalize()` (all words capitalised, no separator).

### `lib/commands/add-handler.js`

Extends an existing project with one new handler:

1. Validates project root (checks for `template.yaml` and `schema/schema.graphql`)
2. Calls `createHandler(root, handlerName)`
3. Calls `appendHandlerToYaml` — extracts the single-handler block from `yamlTemplate`, substitutes handler name, and inserts it before the `Outputs:` section
4. Calls `appendHandlerToSchema` — uses regex to insert the new input type, response type, and field into the correct existing sections (or creates sections if absent)

### `lib/commands/create-handler.js`

Creates the full directory and file tree for one handler under `handlers/<name>/`:

| Path | Content |
|---|---|
| `index.mjs` | Lambda handler entry point (async `handler` export) |
| `constants/constants.mjs` | HTTP status codes and string constants |
| `dal/<name>-dao.mjs` | Data Access Object class with DynamoDB stub |
| `exceptions/exceptions.mjs` | Six custom error classes |
| `helpers/<name>-helper.mjs` | Business logic helper class |
| `transformers/<name>-transformer.mjs` | Payload transformer class |
| `validators/request-validator.mjs` | Joi-based request validator class |

Also creates:

- `mapping/request.vtl` and `mapping/response.vtl` (once, shared)
- `local-test/<name>/local-test.json` — sample event payload
- `local-test/<name>/local-test.mjs` — script to invoke handler locally without SAM
- `.vscode/launch.json` — Node.js debug configuration entry for the handler (merges into existing file if present)

### `lib/templates.js`

Single `TEMPLATES` export object containing all file content as template strings. Placeholders used:

- `{{name}}` — project name
- `{{handlerName}}` — handler name in kebab-case
- `{{capitalizeHandler}}` — handler name in PascalCase

### `lib/schemaTemplate.js`

Exports `getBaseSchema()` which returns the base GraphQL SDL:

```graphql
schema {
  query: Query
  mutation: Mutation
}

type Query
type Mutation

type ResponseDetail {
  status: String!
  statusCode: Int!
  message: String!
  friendlyMessage: String
}
```

### `lib/yamlTemplate.js`

Exports `yamlTemplate.template` — a full AWS SAM `template.yaml` string built with `dedent`. Contains a `{{#each handlers}}…{{/each}}` block that `scaffold-project.js` and `add-handler.js` use for handler injection via regex/string replacement (not a real Handlebars engine — it is plain string manipulation).

---

## Generated Project Structure

```
<project-name>/
├── .vscode/
│   └── launch.json                 # VS Code debug config (one entry per handler)
├── handlers/
│   └── <handler-name>/
│       ├── index.mjs               # Lambda handler (ES module)
│       ├── constants/
│       │   └── constants.mjs
│       ├── dal/
│       │   └── <handler>-dao.mjs   # DynamoDB data access object
│       ├── exceptions/
│       │   └── exceptions.mjs      # Custom error classes
│       ├── helpers/
│       │   └── <handler>-helper.mjs
│       ├── transformers/
│       │   └── <handler>-transformer.mjs
│       └── validators/
│           └── request-validator.mjs
├── layers/
│   └── common-dependency/          # SAM Lambda layer (referenced in template.yaml)
├── local-test/
│   └── <handler-name>/
│       ├── local-test.json         # Sample event payload
│       └── local-test.mjs          # Local invocation script
├── mapping/
│   ├── request.vtl                 # AppSync request mapping template
│   └── response.vtl                # AppSync response mapping template
├── schema/
│   └── schema.graphql              # Generated GraphQL schema
├── .env                            # STAGE, AWS_REGION
├── .gitignore
├── .npmignore
├── eslint.config.mjs
├── package.json
└── template.yaml                   # AWS SAM template
```

---

## Generated SAM Template (`template.yaml`)

The template follows AWS SAM conventions and includes:

**Globals**
- Timeout: 29 seconds
- Runtime: `nodejs20.x`
- Architecture: `arm64`
- Active X-Ray tracing
- Memory: 3024 MB
- Common dependency Lambda layer reference
- Environment variables: `ENVIRONMENT`, `LOG_LEVEL`, `NODE_ENV` (resolved via `FindInMap`)

**Parameters**
- `OrgName` — organisation identifier
- `ServiceName` — service/project name
- `SampleDynamoTbl` — DynamoDB table name
- `Environment` — allowed values: `dev`, `qa`, `ppe`, `prod`

**Mappings (`StagesMap`)**
Each environment (`dev`, `qa`, `ppe`, `prod`) maps:
- VPC subnet IDs (private x2, public x2)
- Security group ID
- Log retention days (1 for dev, 5 for qa/ppe, 365 for prod)
- Log level and Node env
- OpenID Connect issuer and client ID
- S3 bucket name
- Authorizer Lambda ARN
- VAPT enabled flag

**Resources created per project:**
- `commonDependencyLayer` — `AWS::Serverless::LayerVersion`
- `LambdaExecutionRole` — `AWS::IAM::Role` with policies for SSM, X-Ray, EC2 networking, Secrets Manager, DynamoDB (full CRUD), S3, CloudWatch Logs, EventBridge
- `AppSyncGraphQLApi` — `AWS::AppSync::GraphQLApi` with Lambda authorizer (primary) + API key (additional), X-Ray enabled, full field-level logging
- `AuthLambdaPermission` — `AWS::Lambda::Permission`
- `AppSyncGraphQLSchema` — `AWS::AppSync::GraphQLSchema` loaded from S3
- `AppSyncDataSourceRole` — `AWS::IAM::Role`
- `AppSyncLoggingRole` — `AWS::IAM::Role`

**Resources created per handler:**
- `<Handler>Func` — `AWS::Serverless::Function` with VPC config, env vars
- `<Handler>LG` — `AWS::Logs::LogGroup` with environment-mapped retention
- `<Handler>DS` — `AWS::AppSync::DataSource` (Lambda type)
- `<Handler>Resolver` — `AWS::AppSync::Resolver` with VTL mapping templates from S3

**Outputs:** AppSync API URL, API ID, and per-handler function ARN and name.

---

## Generated GraphQL Schema

Authentication directives applied to every field:

```graphql
@aws_api_key    # API key access
@aws_lambda     # Lambda authorizer access
@aws_oidc       # OIDC access
```

Handler naming convention drives schema type:

| Handler name prefix | Schema placement |
|---|---|
| `get-*` | `type Query` |
| anything else | `type Mutation` |

Each handler produces:
- An `input Input<Handler>` type
- A `type <Handler>Response` type
- A field entry in the appropriate `Query` or `Mutation` type

---

## AppSync VTL Mapping Templates

**`request.vtl`**
Validates the incoming payload against an XSS-prevention regex (rejects any string containing HTML tags) then forwards the full AppSync context as the Lambda payload:

```vtl
{
  "version": "2017-02-28",
  "operation": "Invoke",
  "payload": $util.toJson($context)
}
```

**`response.vtl`**
Injects a security header set on every response and returns the Lambda result:

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; preload` |
| `Content-Security-Policy` | `default-src https:` |
| `Permissions-Policy` | `geolocation=()` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `Deny` |
| `X-Permitted-Cross-Domain-Policies` | `none` |

---

## Custom Error Classes

All errors extend the native `Error` class and are isolated to `exceptions/exceptions.mjs` per handler:

| Class | Intended use |
|---|---|
| `ValidationError` | Joi schema validation failures |
| `BusinessLayerError` | Business rule violations in helpers |
| `DataLayerError` | DynamoDB / data access failures in DAOs |
| `ParsingError` | Payload parsing issues |
| `TransformError` | Transformer failures |
| `NotFoundError` | Resource not found |

---

## Local Development

**Running a single handler without SAM:**

```bash
node local-test/<handler-name>/local-test.mjs
```

The script imports the handler directly and passes the `local-test.json` payload.

**Running via SAM:**

```bash
sam build
sam local start-api
```

**Debugging in VS Code:**

Each handler gets a launch configuration in `.vscode/launch.json` that points to its `local-test.mjs`, loads `.env`, and captures stdout.

---

## Deployment

```bash
sam build
sam deploy --guided
```

The guided flow prompts for stack name, region, and parameter overrides (`Environment`, `OrgName`, etc.). The GraphQL schema and VTL templates are expected to be pre-uploaded to an S3 bucket matching the pattern `<OrgName>-app-schema-bucket`.

---

## Linting

`eslint.config.mjs` is generated with flat config format:

```js
export default {
  env: { node: true, es2022: true },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  rules: { 'no-console': 'warn' }
};
```

Run with:

```bash
npm run lint
```

---

## Fixed in v1.0.3

- **Module load crash** — unescaped `${OrgName}` inside the `dedent`-tagged `yamlTemplate` literal threw `ReferenceError` on import. All `!Sub` variables are now escaped (`\${...}`).
- **`CommonDependencyLayer` reference casing** — resource is now `CommonDependencyLayer` (PascalCase), matching the `!Ref` in `Globals`.
- **Resolver `TypeName`** — was hardcoded to `Mutation`; `get-*` handlers now render `TypeName: Query`, driven by a new `{{typeName this.handlerName}}` placeholder.
- **Invalid GraphQL / AppSync names** — handler `get-users` produced the field `get-users(...)` and DataSource `Name: get-usersDS`, both illegal (no hyphens). Field names are now camelCase (`getUsers`), type names PascalCase (`GetUsersResponse`, `InputGetUsers`), DataSource names PascalCase (`GetUsersDS`).
- **Broken `LogGroupName`** — `!Sub /aws/lambda/${Xyz}Func` referenced a non-existent var; now `!Sub '/aws/lambda/${XyzFunc}'`.
- **Lambdas in public subnets** — `VpcConfig` now uses `SubnetPrivate1/2`; the unused `SubnetPublic*` map keys were removed.
- **Hardcoded role names** — `PilotIncident*` role/policy names are now parameterized as `${OrgName}-${ServiceName}-${Environment}-*`.
- **`TABLE_NAME` vs `SAMPLE_TABLE`** — the generated DAO now reads `process.env.SAMPLE_TABLE`, matching the function env var.
- **Indented `.gitignore` / `.npmignore`** — templates no longer carry leading whitespace into the generated files.
- **`.env`** — uses `ENVIRONMENT` (not `STAGE`) and includes `SAMPLE_TABLE`.
- **No-op handler** — `index.mjs` now wires `RequestValidator → PayloadTransformer → <Handler>Helper → <Handler>Dao` and returns a `ResponseDetail`-shaped payload; the `return`-in-`finally` was removed. Exceptions set `.name`; the validator is permissive (`.unknown(true)`) so a fresh handler runs before the schema is filled in.
- **Invalid generated `package.json`** — the `test` script's escaped quotes produced broken JSON; it is now `jest --passWithNoTests`. AWS SDK packages moved from `devDependencies` to `dependencies`.
- **Missing layer manifest** — `layers/common-dependency/package.json` is now generated so `sam build` can build the layer (`ContentUri: ./layers/common-dependency`).
- **Manual S3 asset upload** — `scripts/deploy-assets.mjs` (npm script `deploy:assets`) uploads `schema.graphql` and both `.vtl` files to consistent keys under `s3://<org>-app-schema-bucket/<env>/<service>/`.
- **`add-handler` schema regex** — the field-insert regex lacked cross-line matching and silently no-op'd; it now inserts correctly and creates a `type Mutation` block when the project had none.
- **CLI version/name** — `bin/cli.js` reads its version from `package.json`; the command is `create-lambda-graphql-app` (the old `lambda-node-graphql-starter` bin name is kept as an alias).

## Known Gaps / Notes

- **No real test suite** — `jest` is wired (`npm test` → `jest --passWithNoTests`) but no tests are generated yet.
- **Handlebars-style syntax without Handlebars** — `{{#each}}` / `{{this.handlerName}}` in `yamlTemplate.js` are still processed via `String.replace`, not a real engine. Functional but fragile.
- **Placeholder values in `StagesMap`** — subnet IDs, security group IDs, `AuthorizerLambdaArn`, and OpenID Connect values are still stubs that must be filled in before deployment.
- **Schema bucket must pre-exist** — `deploy-assets.mjs` uploads to `<org>-app-schema-bucket` but does not create it.
- **`add` does not add Outputs** — a handler added via `create-lambda-graphql-app add` gets its `Resources` but no per-handler `Outputs` entry.
