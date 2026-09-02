// README shipped inside every generated project. Explains how to run, deploy,
// and change SAM parameters / configuration.
export function getReadme({ name, orgName }) {
  const org = orgName || 'your-org';

  return `# ${name}

A Node.js GraphQL service for **AWS AppSync + Lambda**, deployed with **AWS SAM**.

The GraphQL schema and VTL mapping templates live in this repo and are uploaded
to S3; \`template.yaml\` wires AppSync data sources and resolvers to one Lambda
per handler.

---

## Prerequisites

- **Node.js >= 18**
- **AWS SAM CLI** – https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
- **AWS credentials** configured (\`aws configure\` or SSO) for the target account
- An existing S3 bucket named \`${org}-app-schema-bucket\` that holds the schema +
  VTL assets (\`sam deploy\` reads them from there)

---

## Install

\`\`\`bash
npm install
npm install --prefix layers/common-dependency
\`\`\`

---

## Project layout

\`\`\`
.
├── handlers/                 # one folder per Lambda function
│   └── <handler>/
│       ├── index.mjs         # entry point (validate -> transform -> helper -> dao)
│       ├── constants/
│       ├── dal/              # data-access layer (DynamoDB, etc.)
│       ├── exceptions/
│       ├── helpers/          # business logic
│       ├── transformers/
│       └── validators/       # Joi request validation
├── layers/common-dependency/ # shared deps packaged as a Lambda layer
├── local-test/<handler>/     # local invoke harness (local-test.mjs + .json)
├── mapping/                  # request.vtl / response.vtl (AppSync resolvers)
├── schema/schema.graphql     # GraphQL SDL
├── scripts/deploy-assets.mjs # uploads schema + VTL to S3
├── template.yaml             # AWS SAM template
├── samconfig.toml            # SAM CLI config (stack name, params, region)
└── .prettierrc.json          # code formatting rules
\`\`\`

---

## Run locally

Invoke a single handler directly with Node (uses \`local-test/<handler>/local-test.json\`
as the event, \`.env\` for environment variables):

\`\`\`bash
node --env-file=.env local-test/<handler>/local-test.mjs
\`\`\`

Or emulate the API with the SAM CLI:

\`\`\`bash
npm run build          # sam build
npm run local          # sam local start-api
\`\`\`

You can also debug from VS Code – a \`launch.json\` config is generated per handler.

---

## Format & lint

\`\`\`bash
npm run format         # prettier --write .
npm run format:check   # verify formatting in CI
npm run lint           # eslint .
\`\`\`

---

## Deploy

\`\`\`bash
# 1. Build the functions and layer
npm run build

# 2. Upload schema.graphql + request.vtl + response.vtl to S3
npm run deploy:assets -- --org ${org} --env dev

# 3. Deploy the stack (uses samconfig.toml; add --guided the first time)
sam deploy --guided
\`\`\`

After the first \`--guided\` deploy, the answers are saved to \`samconfig.toml\` and
later deploys are just:

\`\`\`bash
npm run deploy:assets -- --org ${org} --env dev
npm run deploy
\`\`\`

> Re-run \`deploy:assets\` whenever \`schema/schema.graphql\` or the \`mapping/*.vtl\`
> files change – SAM only picks them up from S3.

---

## Changing SAM parameters & configuration

### 1. Stack parameters (\`template.yaml\` → \`Parameters\`)

- \`OrgName\` – prefix for resource names + the schema S3 bucket (default \`${org}\`)
- \`ServiceName\` – service identifier in resource names (default \`${name}\`)
- \`SampleDynamoTbl\` – DynamoDB table the IAM role is scoped to (default \`account-sample-table\`)
- \`Environment\` – one of \`dev\`, \`qa\`, \`ppe\`, \`prod\` (default \`dev\`)

Override at deploy time:

\`\`\`bash
sam deploy --parameter-overrides Environment=qa OrgName=${org} SampleDynamoTbl=my-table
\`\`\`

or persist them in \`samconfig.toml\`:

\`\`\`toml
[default.deploy.parameters]
parameter_overrides = "Environment=\\"dev\\" OrgName=\\"${org}\\" ServiceName=\\"${name}\\""
\`\`\`

### 2. Per-environment values (\`template.yaml\` → \`Mappings.StagesMap\`)

Environment-specific settings (VPC subnets, security group, OIDC issuer, log
retention, log level, S3 bucket, authorizer Lambda ARN) are keyed by environment
in \`StagesMap\`. Edit the block for the stage you deploy, e.g.:

\`\`\`yaml
Mappings:
  StagesMap:
    dev:
      SubnetPrivate1: subnet-xxxxxxxx
      SubnetPrivate2: subnet-yyyyyyyy
      SecurityGroup: sg-zzzzzzzz
      LogRetentionDays: 7
      BucketName: ${org}-dev-application-bucket
      AuthorizerLambdaArn: arn:aws:lambda:us-east-1:...:function:my-authorizer
\`\`\`

Values are read with \`!FindInMap [StagesMap, !Ref Environment, <Key>]\`.

### 3. Function defaults (\`template.yaml\` → \`Globals.Function\`)

Change \`Timeout\`, \`MemorySize\`, \`Runtime\`, \`Architectures\`, \`Tracing\`, or shared
\`Environment.Variables\` here to affect every function at once. Override per
function inside that function's \`Properties\`.

### 4. Add a handler

\`\`\`bash
npx create-lambda-graphql-app add <handler-name>
\`\`\`

Names starting with \`get-\` become GraphQL **queries**; everything else becomes a
**mutation**. This updates \`template.yaml\` and \`schema/schema.graphql\`, then:

\`\`\`bash
npm run build
npm run deploy:assets -- --org ${org} --env dev
npm run deploy
\`\`\`

### 5. SAM CLI behaviour (\`samconfig.toml\`)

Stack name, region, \`capabilities\`, \`confirm_changeset\`, \`resolve_s3\`, build
caching, and \`warm_containers\` for local API are set here so the bare \`sam build\`
/ \`sam deploy\` / \`sam local start-api\` commands work without extra flags. See
https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-config.html

---

## License

MIT
`;
}
