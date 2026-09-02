export const TEMPLATES = {
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

# OS
.DS_Store
`,
  npmignore: `node_modules
.sam
.build
.aws-sam
.env
`,
  env: `ENVIRONMENT=dev
AWS_REGION=us-east-1
SAMPLE_TABLE=account-sample-table
`,
  eslint: `export default {
  env: { node: true, es2022: true },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  rules: { 'no-console': 'warn' },
};
`,
  prettierrc: `{
  "singleQuote": true,
  "semi": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "es5",
  "arrowParens": "always"
}
`,
  prettierignore: `node_modules
.aws-sam
.sam
.build
.vscode
coverage
package-lock.json
`,

  packageJson: `{
  "name": "{{name}}",
  "version": "1.0.0",
  "description": "Node.js GraphQL Lambda with AWS SAM",
  "main": "index.mjs",
  "type": "module",
  "engines": {
    "node": ">=18"
  },
  "keywords": [
    "graphql",
    "lambda",
    "serverless",
    "aws",
    "sam"
  ],
  "scripts": {
    "test": "jest --passWithNoTests",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "local": "sam local start-api",
    "build": "sam build",
    "deploy:assets": "node scripts/deploy-assets.mjs",
    "deploy": "sam deploy"
  },
  "author": "Jamaluddin Mondal",
  "license": "MIT",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.682.0",
    "@aws-sdk/lib-dynamodb": "^3.682.0",
    "@aws-sdk/util-dynamodb": "^3.682.0",
    "@aws-sdk/client-s3": "^3.682.0",
    "@aws-sdk/s3-request-presigner": "^3.682.0",
    "@joi/date": "^2.1.1",
    "joi": "^17.13.3",
    "moment": "^2.29.4",
    "uuid": "^8.3.2"
  },
  "devDependencies": {
    "@eslint/js": "^8.52.0",
    "@eslint/eslintrc": "^3.1.0",
    "eslint": "^8.52.0",
    "jest": "^29.7.0",
    "prettier": "^3.3.3"
  }
}
`,
  layerPackageJson: `{
  "name": "{{name}}-common-dependency",
  "version": "1.0.0",
  "description": "Shared runtime dependencies packaged as a Lambda layer",
  "type": "module",
  "private": true,
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.682.0",
    "@aws-sdk/lib-dynamodb": "^3.682.0",
    "@aws-sdk/util-dynamodb": "^3.682.0",
    "@aws-sdk/client-s3": "^3.682.0",
    "@aws-sdk/s3-request-presigner": "^3.682.0",
    "@joi/date": "^2.1.1",
    "joi": "^17.13.3",
    "moment": "^2.29.4",
    "uuid": "^8.3.2"
  }
}
`,
  samconfig: `version = 0.1

[default.global.parameters]
stack_name = "{{name}}"

[default.build.parameters]
cached = true
parallel = true

[default.validate.parameters]
lint = true

[default.deploy.parameters]
capabilities = "CAPABILITY_NAMED_IAM"
confirm_changeset = true
resolve_s3 = true
region = "us-east-1"
parameter_overrides = "Environment=\\"dev\\" OrgName=\\"{{orgName}}\\" ServiceName=\\"{{name}}\\""

[default.local_start_api.parameters]
warm_containers = "EAGER"
`,
  deployAssets: `/**
 * Uploads the GraphQL schema and VTL mapping templates to the S3 bucket that
 * template.yaml references. Run this after "sam build" and before "sam deploy".
 *
 *   node scripts/deploy-assets.mjs --org <org> --env dev
 *   npm run deploy:assets -- --org <org> --env dev
 *
 * The target bucket ("<org>-app-schema-bucket") must already exist.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i].startsWith('--')) {
    args[argv[i].slice(2)] = argv[i + 1];
    i += 1;
  }
}

const org = args.org ?? process.env.ORG_NAME;
const service = args.service ?? process.env.SERVICE_NAME ?? '{{name}}';
const env = args.env ?? process.env.ENVIRONMENT ?? 'dev';
const region = args.region ?? process.env.AWS_REGION ?? 'us-east-1';

if (!org) {
  console.error(
    'Missing --org (or ORG_NAME). Usage: node scripts/deploy-assets.mjs --org <org> --env dev'
  );
  process.exit(1);
}

const bucket = org + '-app-schema-bucket';
const prefix = env + '/' + service;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const assets = [
  ['schema/schema.graphql', prefix + '/schema.graphql', 'application/graphql'],
  ['mapping/request.vtl', prefix + '/request.vtl', 'text/plain'],
  ['mapping/response.vtl', prefix + '/response.vtl', 'text/plain'],
];

const s3 = new S3Client({ region });

for (const [local, key, contentType] of assets) {
  const body = await readFile(path.join(root, local));
  await s3.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  );
  console.log('uploaded s3://' + bucket + '/' + key);
}

console.log('\\nAll assets uploaded. You can now run: sam deploy');
`,
  handlerIndex: `import { RequestValidator } from './validators/request-validator.mjs';
import { PayloadTransformer } from './transformers/{{handlerName}}-transformer.mjs';
import { {{capitalizeHandler}}Helper } from './helpers/{{handlerName}}-helper.mjs';
import { HTTP_STATUS_CODES } from './constants/constants.mjs';
import {
  ValidationError,
  ParsingError,
  TransformError,
  BusinessLayerError,
  DataLayerError,
  NotFoundError,
} from './exceptions/exceptions.mjs';

const statusCodeFor = (err) => {
  if (err instanceof NotFoundError) return HTTP_STATUS_CODES.NOT_FOUND;
  if (
    err instanceof ValidationError ||
    err instanceof ParsingError ||
    err instanceof TransformError ||
    err instanceof BusinessLayerError ||
    err instanceof DataLayerError
  ) {
    return HTTP_STATUS_CODES.BAD_REQUEST;
  }
  return 500;
};

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  try {
    const args = event?.arguments?.input{{capitalizeHandler}} ?? event?.arguments ?? event ?? {};

    const validated = await new RequestValidator().validate{{capitalizeHandler}}Payload(args);
    const transformed = await new PayloadTransformer(validated).transform();
    const data = await new {{capitalizeHandler}}Helper(transformed).execute();

    return {
      data,
      responseDetail: {
        status: 'SUCCESS',
        statusCode: HTTP_STATUS_CODES.OK,
        message: 'Request processed successfully.',
      },
    };
  } catch (err) {
    console.error('Error:', err);

    return {
      data: null,
      responseDetail: {
        status: 'FAILURE',
        statusCode: statusCodeFor(err),
        message: err?.message ?? 'Unexpected error.',
      },
    };
  }
};
`,
  constants: `export const SUCC_MSG = 'Case created successfully.';
export const TBL_NAME_MISSING_MSG = 'Table Name missing in environment variables!';
export const EMPTY_PL_MSG = 'Payload is empty!';
export const FAILURE_MSG = 'Unable to create case!';
export const FALSE_FLAG = false;
export const TRUE_FLAG = true;

export const HTTP_STATUS_CODES = {
  CREATED: 201,
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
};
`,

  dao: `import { DataLayerError } from '../exceptions/exceptions.mjs';

export class {{capitalizeHandler}}Dao {
  constructor(payload) {
    this.payload = payload;
    this.tableName = process.env.SAMPLE_TABLE;
  }

  execute = async () => {
    try {
      // TODO: DynamoDB read/write goes here
      return {};
    } catch (err) {
      console.error(err);
      throw new DataLayerError(err.message);
    }
  };
}
`,

  exceptions: `class AppError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {}
export class BusinessLayerError extends AppError {}
export class DataLayerError extends AppError {}
export class ParsingError extends AppError {}
export class TransformError extends AppError {}
export class NotFoundError extends AppError {}
`,

  helper: `import { BusinessLayerError } from '../exceptions/exceptions.mjs';
import { DataLayerError } from '../exceptions/exceptions.mjs';
import { {{capitalizeHandler}}Dao } from '../dal/{{handlerName}}-dao.mjs';

export class {{capitalizeHandler}}Helper {
  constructor(payload) {
    this.payload = payload;
  }

  execute = async () => {
    try {
      // TODO: business rules go here
      return await new {{capitalizeHandler}}Dao(this.payload).execute();
    } catch (err) {
      console.error(err);
      if (err instanceof DataLayerError) throw err;
      throw new BusinessLayerError(err.message);
    }
  };
}
`,
  transformer: `import { TransformError } from '../exceptions/exceptions.mjs';

export class PayloadTransformer {
  constructor(payload) {
    this.payload = payload;
  }

  transform = async () => {
    try {
      console.log('Transforming payload:', this.payload);
      // TODO: reshape the payload for the business layer
      return this.payload;
    } catch (err) {
      console.error(err);
      throw new TransformError(err.message);
    }
  };
}
`,
  requestValidator: `import Joi from 'joi';
import { ValidationError } from '../exceptions/exceptions.mjs';

export class RequestValidator {
  validate{{capitalizeHandler}}Payload = async (payload) => {
    console.log('Validating payload:', payload);

    try {
      const schema = Joi.object({
        // TODO: describe the expected {{capitalizeHandler}} fields, e.g.
        // title: Joi.string().required(),
      }).unknown(true);
      return await schema.validateAsync(payload ?? {});
    } catch (err) {
      console.error(err);
      throw new ValidationError(err.message);
    }
  };
}
`,

  requestVtl: `#set($validRegexForString = "^(?!.*<[^>]+>).*$")
#set($valid = $util.matches($validRegexForString, $util.toJson($context.arguments)))
#if(!$valid)
  $util.error("HTML tags not allowed!", "ValidationError")
#end

{
  "version": "2017-02-28",
  "operation": "Invoke",
  "payload": $util.toJson($context)
}
`,
  responseVtl: `#if($context.result)
  $util.http.addResponseHeader("Strict-Transport-Security", "max-age=31536000; preload")
  $util.http.addResponseHeader("Content-Security-Policy", "default-src https:")
  $util.http.addResponseHeader("Permissions-Policy", "geolocation=()")
  $util.http.addResponseHeader("Referrer-Policy", "strict-origin-when-cross-origin")
  $util.http.addResponseHeader("X-Content-Type-Options", "nosniff")
  $util.http.addResponseHeader("X-Frame-Options", "Deny")
  $util.http.addResponseHeader("X-Permitted-Cross-Domain-Policies", "none")
  $util.toJson($context.result)
#else
  []
#end
`,

  localTestJson: `{
  "field1": "value1",
  "field2": "value2"
}
`,
  localTestMjs: `import { handler } from '../../handlers/{{handlerName}}/index.mjs';
import event from './local-test.json' with { type: 'json' };

handler(event)
  .then((result) => {
    console.log('Result:', result);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
`,
  vscodeLaunchJson: `{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "{{handlerName}}",
      "program": "\${workspaceFolder}/local-test/{{handlerName}}/local-test.mjs",
      "envFile": "\${workspaceFolder}/.env",
      "request": "launch",
      "skipFiles": ["<node_internals>/**"],
      "type": "node",
      "outputCapture": "std"
    }
  ]
}
`,
};
