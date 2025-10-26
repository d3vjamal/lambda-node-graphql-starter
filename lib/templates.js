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
    Value: !Sub "https://\${GraphQLApi}.execute-api.\${AWS::Region}.amazonaws.com/\${Stage}"`,

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
  handlerIndex: `// {{handlerName}}/index.mjs – {{lambdaName}}
export const handler = async (event) => {
  console.log('Event:', event);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello from {{lambdaName}}' })
  };
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

  dao: `// {{handlerName}}/dal/{{handlerName}}-dao.mjs
export const create{{capitalizeHandler}} = async (data) => {
  // TODO: implement
  return data;
};
`,

  exceptions: `
    export class ValidationError extends Error { }
    export class BusinessLayerError extends Error { }
    export class DataLayerError extends Error { }
    export class ParsingError extends Error { }
    export class TransformError extends Error { }
    export class NotFoundError extends Error { }
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
  requestValidator: `#set($vaildRegexForString = "^(?!.*<[^>]+>).*$")
    #if ($context.info.fieldName == "sendStatementEmail")
        #set($hashMap = $context.arguments.inputLetter)
        #foreach($key in $hashMap.keySet())
            #set($val = $hashMap.get($key).toString())
            #set($valid1 = $util.matches($vaildRegexForString, $val))
            #if(!$valid1 && $key != "email_statement")
                $util.error("HTML tags not allowed!", "ValidationError")
            #end
        #end
    #else
        #set($valid = $util.matches($vaildRegexForString, $util.toJson($context.arguments)))
        #if(!$valid)
            $util.error("HTML tags not allowed!", "ValidationError")
        #end
    #end

    {
      "version" : "2017-02-28",
      "operation": "Invoke",
      "payload": $util.toJson($context)
    }`,

  requestVtl: `#set($inputPath = $input.path('$'))
{
  "version": "2018-05-29",
  "operation": "Invoke",
  "payload": $input.json('$')
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
  "body": {
    "title": "Test {{lambdaName}}",
    "description": "Generated local test payload"
  }
}`,
  localTestMjs: `// local-test/{{handlerName}}/local-test.mjs
import { handler } from '../../handlers/{{handlerName}}/index.mjs';
import event from './local-test.json';

async function run() {
  const response = await handler(event);
  console.log('Response:', JSON.stringify(response, null, 2));
}

run().catch(console.error);
`,
  vscodeLaunchJson: `
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "{{ handlerName }}",
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
