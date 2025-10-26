
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES = {
  // Root files
  gitignore: `# Node
node_modules/
npm-debug.log
yarn-error.log
yarn-debug.log*

# SAM
.sam
.build
.aws-sam

# Local
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`,
  npmignore: `node_modules
.sam
.build
.env
`,
  env: `# Environment variables
STAGE=dev
AWS_REGION=us-east-1
`,
  eslint: `module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'no-console': 'warn',
  },
};
`,

  templateYaml: `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: GraphQL Lambda Starter – {{name}}

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
  keywords: [
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
  },
}
`,
};

async function run() {
  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name (kebab-case):',
      validate: (i) => /^[a-z0-9-]+$/i.test(i) || 'Only letters, numbers, hyphens'
    }
  ]);

  const root = path.resolve(process.cwd(), projectName);
  if (await fs.pathExists(root)) {
    console.log(chalk.red(`Folder "${projectName}" already exists.`));
    process.exit(1);
  }

  console.log(chalk.cyan(`Scaffolding ${projectName} …`));

  const replace = (t) => t.replace(/{{name}}/g, projectName);

  // --- Directories ---
  const dirs = [
    'handlers/register-user',
    'layers',
    'local-test',
    'mapping',
    'node_modules',
    'schema',
    '.vscode',
  ];
  for (const d of dirs) await fs.ensureDir(path.join(root, d));

  // --- Files ---
  await fs.writeFile(path.join(root, '.gitignore'), TEMPLATES.gitignore);
  await fs.writeFile(path.join(root, '.npmignore'), TEMPLATES.npmignore);
  await fs.writeFile(path.join(root, '.env'), TEMPLATES.env);
  await fs.writeFile(path.join(root, 'eslint.config.mjs'), TEMPLATES.eslint);

  await fs.writeFile(path.join(root, 'template.yaml'), replace(TEMPLATES.templateYaml));
  await fs.writeFile(path.join(root, 'package.json'), replace(TEMPLATES.packageJson));

  // Empty placeholder files in folders
  await fs.writeFile(path.join(root, 'handlers/register-user/index.js'), `// register-user handler
export const handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Register user stub" })
  };
};
`);
  await fs.writeFile(path.join(root, 'schema/schema.graphql'), `# GraphQL schema
type Query {
  hello: String
}
`);
  await fs.writeFile(path.join(root, '.vscode/settings.json'), `{
  "eslint.validate": ["javascript"],
  "editor.formatOnSave": true
}
`);

  console.log(chalk.green(`Project "${projectName}" created!`));
  console.log(chalk.gray(`
Next steps:
  cd ${projectName}
  npm install
  npm run lint
  sam build
  sam deploy --guided
  sam local start-api
`));
}

run().catch(err => {
  console.error(chalk.red('Error:'), err);
  process.exit(1);
});