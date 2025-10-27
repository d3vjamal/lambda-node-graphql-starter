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
    "test": "echo \"Error: no test specified\" && exit 1",
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
  handlerIndex: `

export const handler = async (event) => {
  console.log('Event:', event);
  let resposnse = {}
  try {

    //other logic can go here

    return resposnse
  } catch (err) {
    console.log('Error:', err);
    response = {}
  }
  finally {
    return response
  }
};

  `,
  constants: `
        export const SUCC_MSG = "Case created successfully."
        export const TBL_NAME_MISSING_MSG = "Table Name missing in environment variables!"
        export const EMPTY_PL_MSG = "Payload is empty!"
        export const FAILURE_MSG = "Unable to create case!"
        export const FALSE_FLAG = false
        export const TRUE_FLAG = true
        export const HTTP_STATUS_CODES = {
            CREATED: 201,
            OK: 200,
            BAD_REQUEST: 400,
            UNAUTHORIZED: 401,
            FORBIDDEN: 403,
            NOT_FOUND: 404
      }`,

  dao: `import { DataLayerError } from '../exceptions/exceptions.mjs';

export class {{capitalizeHandler}}Dao {
  constructor(payload) {
    this.payload = payload
    this.tableName = process.env.TABLE_NAME
  }
  createAccount = async () => {
    try {

      return {};

    }
    catch (err) {
      console.log(err);
      throw new DataLayerError(err.message)
    }

  }
}`,

  exceptions: `
        export class ValidationError extends Error { }
        export class BusinessLayerError extends Error { }
        export class DataLayerError extends Error { }
        export class ParsingError extends Error { }
        export class TransformError extends Error { }
        export class NotFoundError extends Error { }
      `,

  helper: `
import { BusinessLayerError } from '../exceptions/exceptions.mjs';

export class {{capitalizeHandler}}Helper {
  constructor(payload) {
    this.payload = payload
  }
  createAccount = async () => {
    try {

      return {};

    }
    catch (err) {
      console.log(err);
      throw new BusinessLayerError(err.message)
    }

  }
}`,
  transformer: `import { TransformError } from "../exceptions/exceptions.mjs"

    export class PayloadTransformer {
      constructor(payload) {
        this.payload = payload
      }
      transform = async () => {
        try {
          console.log('Transforming payload:', this.payload);

          return {};
        }
        catch (err) {
          console.log(err);
          throw new TransformError(err.message)
        }
      }
    }`,
  requestValidator: `import { ValidationError } from "../exceptions/exceptions.mjs"
    import Joi from "joi";


    export class RequestValidator {

      validate{{capitalizeHandler}}Payload = async (payload) => {
        console.log('Validating payload:', payload);

        try {
          const schema = Joi.object({
            title: Joi.string().required(),
            status: Joi.string().required()
          });
          return await schema.validateAsync(payload);
        } catch (err) {
          console.log(err);
          throw new ValidationError(err.message);
        }

      }
    }`,

  requestVtl: `
      #set($vaildRegexForString = "^(?!.*<[^>]+>).*$")
    #set($valid = $util.matches($vaildRegexForString, $util.toJson($context.arguments)))
    #if(!$valid)
        $util.error("HTML tags not allowed!", "ValidationError")
    #end

    {
      "version" : "2017-02-28",
      "operation": "Invoke",
      "payload": $util.toJson($context)
    }`,
  responseVtl: `
  #if($context.result)
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
    }`,
  localTestMjs: `
  import { handler } from '../../handlers/{{handlerName}}/index.mjs';
  import event from './local-test.json' with { type: 'json' };

  handler(event)
    .then((result) => {
      console.log('Result:', result)
    })
    .catch((error) => {
      console.error('Error:', error)
    });
  `,
  vscodeLaunchJson: `
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "{{handlerName}}",
            "program": "\${workspaceFolder}/local-test/{{handlerName}}/local-test.mjs",
            "envFile": "\${workspaceFolder}/.env",
            "request": "launch",
            "skipFiles": [
                "<node_internals>/**"
            ],
            "type": "node",
            "outputCapture": "std"
        }
    ]
}

`
};
