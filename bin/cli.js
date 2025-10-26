#!/usr/bin/env node
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility: capitalize each word in kebab-case
const capitalize = (str) =>
  str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

// === TEMPLATES ===
const TEMPLATES = {
  gitignore: `# Node
node_modules/
npm-debug.log
yarn-error.log

# SAM
.sam
.build
.aws-sam

# Local
.env
.env.local
`,
  npmignore: `node_modules
.sam
.build
.env
`,
  env: `STAGE=dev
AWS_REGION=us-east-1
`,
  eslint: `export default {
  env: { node: true, es2022: true },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  rules: { 'no-console': 'warn' }
};
`,

  templateYaml: `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: GraphQL Lambda – {{name}}

Globals:
  Function:
    Runtime: nodejs20.x
    Architectures: [arm64]
    MemorySize: 256
    Timeout: 30
    Environment:
      Variables:
        STAGE: !Ref Stage
        LOG_LEVEL: info
        NODE_ENV: development

Parameters:
  Stage:
    Type: String
    Default: dev

Resources:
  GraphQLApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      StageName: !Ref Stage

  RegisterUserFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: handlers/register-user/
      Handler: index.handler
      Events:
        Api:
          Type: HttpApi
          Properties:
            Path: /register
            Method: post
            ApiId: !Ref GraphQLApi

Outputs:
  ApiUrl:
    Value: !Sub "https://\${GraphQLApi}.execute-api.\${AWS::Region}.amazonaws.com/\${Stage}"
`,
  packageJson: `{
  "name": "{{name}}",
  "version": "1.0.0",
  "description": "Node.js GraphQL Lambda with AWS SAM",
  "main": "index.js",
  "type": "module",
  "keywords": [
    "graphql",
    "lambda",
    "serverless",
    "aws",
    "sam"
  ],
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1",
    "lint": "eslint .",
    "local": "sam local start-api"
  },
  "author": "Jamaluddin Mondal",
  "license": "MIT",
  "dependencies": {
   "@joi/date": "^2.1.1",
    "joi": "^17.13.3",
    "moment": "^2.29.4",
    "uuid": "^8.3.2"
  },
    "devDependencies": {
    "@aws-sdk/client-dynamodb": "^3.637.0",
    "@aws-sdk/lib-dynamodb": "^3.637.0",
    "@aws-sdk/client-s3": "^3.637.0",
    "@aws-sdk/s3-request-presigner": "^3.637.0",
    "@aws-sdk/util-dynamodb": "^3.682.0",
    "@eslint/js": "^8.52.0",
    "@eslint/eslintrc": "^3.1.0",
    "aws-sdk": "^2.1691.0",
    "eslint": "^8.52.0",
    "jest": "^29.7.0",
    "mocha": "^10.2.0",
    "chai": "^5.1.1",
    "c8": "^8.0.1"
  }
}
`,
  handlerIndex: `// {{handlerName}}/index.mjs – {{lambdaName}}
export const handler = async (event) => {
  console.log('Event:', event);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello from {{lambdaName}}' })
  };
};
`,
  constants: `// {{handlerName}}/constants/constants.mjs
export const STATUS = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED'
};
`,
  dao: `// {{handlerName}}/dal/{{handlerName}}-dao.mjs
export const create{{capitalizeHandler}} = async (data) => {
  // TODO: implement
  return data;
};
`,
  exceptions: `// {{handlerName}}/exceptions/exceptions.mjs
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}
`,
  helper: `// {{handlerName}}/helpers/{{handlerName}}-helper.mjs
export const build{{capitalizeHandler}} = (input) => {
  return { ...input, createdAt: new Date().toISOString() };
};
`,
  transformer: `// {{handlerName}}/transformers/{{handlerName}}-transformer.mjs
export const transform{{capitalizeHandler}} = (incident) => {
  return {
    id: incident.id,
    title: incident.title,
    status: incident.status
  };
};
`,
  requestValidator: `// {{handlerName}}/validators/request-validator.mjs
export const validate{{capitalizeHandler}}Request = (body) => {
  if (!body.title) throw new Error('Title is required');
  return true;
};
`,

  // ──────────────────────────────────────
  // MAPPING & LOCAL-TEST (FIXED)
  // ──────────────────────────────────────
  requestVtl: `#set($inputPath = $input.path('$'))
{
  "version": "2018-05-29",
  "operation": "Invoke",
  "payload": $input.json('$')
}`,
  responseVtl: `#set($context.responseOverride.status = 200)
$util.toJson($context.result)`,

  localTestJson: `{
  "body": {
    "title": "Test {{lambdaName}}",
    "description": "Generated local test payload"
  }
}`,
  localTestMjs: `// local-test/{{handlerName}}/local-test.mjs
import { handler } from '../../handlers/{{handlerName}}/index.mjs';

async function run() {
  const event = require('./local-test.json');
  const response = await handler(event);
  console.log('Response:', JSON.stringify(response, null, 2));
}

run().catchuchy(console.error);
`
};

// === CREATE HANDLER ===
async function createHandler(root, lambdaName, handlerName) {
  const hPath = path.join(root, 'handlers', handlerName);
  await fs.ensureDir(hPath);

  const cap = capitalize(handlerName);
  const replace = (tmpl) =>
    tmpl
      .replace(/{{handlerName}}/g, handlerName)
      .replace(/{{lambdaName}}/g, lambdaName)
      .replace(/{{capitalizeHandler}}/g, cap);

  // Handler files
  await fs.writeFile(path.join(hPath, 'index.mjs'), replace(TEMPLATES.handlerIndex));
  await fs.ensureDir(path.join(hPath, 'constants'));
  await fs.writeFile(path.join(hPath, 'constants', 'constants.mjs'), replace(TEMPLATES.constants));
  await fs.ensureDir(path.join(hPath, 'dal'));
  await fs.writeFile(path.join(hPath, 'dal', `${handlerName}-dao.mjs`), replace(TEMPLATES.dao));
  await fs.ensureDir(path.join(hPath, 'exceptions'));
  await fs.writeFile(path.join(hPath, 'exceptions', 'exceptions.mjs'), replace(TEMPLATES.exceptions));
  await fs.ensureDir(path.join(hPath, 'helpers'));
  await fs.writeFile(path.join(hPath, 'helpers', `${handlerName}-helper.mjs`), replace(TEMPLATES.helper));
  await fs.ensureDir(path.join(hPath, 'transformers'));
  await fs.writeFile(path.join(hPath, 'transformers', `${handlerName}-transformer.mjs`), replace(TEMPLATES.transformer));
  await fs.ensureDir(path.join(hPath, 'validators'));
  await fs.writeFile(path.join(hPath, 'validators', 'request-validator.mjs'), replace(TEMPLATES.requestValidator));

  // MAPPING (once)
  const mappingDir = path.join(root, 'mapping');
  await fs.ensureDir(mappingDir);
  await fs.writeFile(path.join(mappingDir, 'request.vtl'), TEMPLATES.requestVtl);
  await fs.writeFile(path.join(mappingDir, 'response.vtl'), TEMPLATES.responseVtl);

  // LOCAL-TEST (per handler)
  const localTestDir = path.join(root, 'local-test', handlerName);
  await fs.ensureDir(localTestDir);
  await fs.writeFile(path.join(localTestDir, 'local-test.json'), replace(TEMPLATES.localTestJson));
  await fs.writeFile(path.join(localTestDir, 'local-test.mjs'), replace(TEMPLATES.localTestMjs));

  console.log(chalk.blue(`Handler "${handlerName}" → ${lambdaName}`));
}

// === MAIN ===
async function run() {
  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name (kebab-case):',
      validate: (i) => /^[a-z0-9-]+$/.test(i) || 'Only letters, numbers, hyphens'
    }
  ]);

  const root = path.resolve(process.cwd(), projectName);
  if (await fs.pathExists(root)) {
    console.log(chalk.red(`Folder "${projectName}" already exists.`));
    process.exit(1);
  }

  console.log(chalk.cyan(`Scaffolding ${projectName}…`));

  const replace = (t) => t.replace(/{{name}}/g, projectName);

  // Root dirs
  const dirs = ['handlers', 'layers', 'local-test', 'mapping', 'node_modules', 'schema', '.vscode'];
  for (const d of dirs) await fs.ensureDir(path.join(root, d));

  // Root files
  await fs.writeFile(path.join(root, '.gitignore'), TEMPLATES.gitignore);
  await fs.writeFile(path.join(root, '.npmignore'), TEMPLATES.npmignore);
  await fs.writeFile(path.join(root, '.env'), TEMPLATES.env);
  await fs.writeFile(path.join(root, 'eslint.config.mjs'), TEMPLATES.eslint);
  await fs.writeFile(path.join(root, 'template.yaml'), replace(TEMPLATES.templateYaml));
  await fs.writeFile(path.join(root, 'package.json'), replace(TEMPLATES.packageJson));

  // Placeholder files
  await fs.writeFile(path.join(root, 'schema/schema.graphql'), `# type Query { hello: String }\n`);
  await fs.writeFile(path.join(root, '.vscode/settings.json'), `{
  "eslint.validate": ["javascript"],
  "editor.formatOnSave": true
}\n`);
  await fs.ensureDir(path.join(root, 'mapping'));
  await fs.writeFile(path.join(root, 'mapping', 'request.vtl'), TEMPLATES.requestVtl);
  await fs.writeFile(path.join(root, 'mapping', 'response.vtl'), TEMPLATES.responseVtl);



  // === Add Handlers ===
  let addMore = true;
  while (addMore) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'lambdaName',
        message: 'Lambda display name (e.g. Register User):',
        validate: (i) => i.trim().length > 0 || 'Required'
      },
      {
        type: 'input',
        name: 'handlerName',
        message: 'Handler folder name (kebab-case, e.g. register-user):',
        validate: (i) => /^[a-z0-9-]+$/.test(i) || 'Only letters, numbers, hyphens'
      },
      {
        type: 'confirm',
        name: 'more',
        message: 'Add another handler?',
        default: false
      }
    ]);
    await createHandler(root, answers.lambdaName, answers.handlerName);
    addMore = answers.more;
  }

  console.log(chalk.green(`\nYour project "${projectName}" is ready!, Start building cool stuff 🚀`));
  console.log(chalk.gray(`
Next:
  cd ${projectName}
  npm install
  npm run lint
  sam build
  sam deploy --guided
  sam local start-api
`));
}

run().catch((err) => {
  console.error(chalk.red('Error:'), err);
  process.exit(1);
});