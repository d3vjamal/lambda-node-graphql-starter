# Create Lambda GraphQL App

[![npm version](https://badge.fury.io/js/create-lambda-graphql-app.svg)](https://badge.fury.io/js/create-lambda-graphql-app)

A CLI tool to quickly scaffold a new Node.js GraphQL project for AWS Lambda, using AWS SAM for deployment.

## Features

- **GraphQL Ready**: Starts you with a working GraphQL schema and resolver.
- **AWS Lambda**: Pre-configured for deployment to AWS Lambda.
- **AWS SAM**: Uses AWS Serverless Application Model (SAM) for defining and deploying your serverless application.
- **ES Modules**: Uses modern ES modules syntax.
- **Local Development**: Test your Lambda functions locally with `sam local start-api`.
- **Linting**: Comes with ESLint configured for code quality.
- **VS Code Integration**: Includes a `launch.json` for easy debugging from VS Code.
- **Interactive CLI**: An interactive CLI to customize your project setup.
- **Organized Structure**: A clean and scalable project structure.

## Tech Stack

- **Runtime**: Node.js 20.x
- **Framework**: None (vanilla Node.js)
- **Deployment**: AWS SAM
- **GraphQL**: `graphql` npm package
- **Linting**: ESLint
- **Testing**: (coming soon)

## Quick Start

To create a new project, run the following command:

```bash
npx create-lambda-graphql-app my-app-name
```

The CLI will prompt you for a project name and other details.

## Usage

Once the project is generated, navigate to the project directory:

```bash
cd my-app-name
```

### Install dependencies:

```bash
npm install
```

### Local Development

To start the local development server, run:

```bash
sam local my-app-name
```

This will start a local API Gateway that you can use to test your GraphQL endpoint.

### Deployment

To deploy your application to AWS, run:

```bash
sam build
sam deploy --guided
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
