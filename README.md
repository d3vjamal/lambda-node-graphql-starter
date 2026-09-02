# Create Lambda GraphQL App

[![npm version](https://badge.fury.io/js/create-lambda-graphql-app.svg)](https://badge.fury.io/js/create-lambda-graphql-app)

A CLI tool to quickly scaffold a new Node.js GraphQL project for AWS Lambda, using AWS SAM for deployment.

## ✨ Features

- **GraphQL Ready**: Starts you with a working GraphQL schema and resolver.
- **AWS Lambda**: Pre-configured for deployment to AWS Lambda.
- **AWS SAM**: Uses AWS Serverless Application Model (SAM) for defining and deploying your serverless application.
- **ES Modules**: Uses modern ES modules syntax.
- **Local Development**: Test your Lambda functions locally with `sam local start-api`.
- **Linting**: Comes with ESLint configured for code quality.
- **Formatting**: Ships with a Prettier config (`.prettierrc.json`) and `format` / `format:check` scripts; all generated code is pre-formatted.
- **Generated README**: Every scaffolded project gets its own `README.md` covering how to run, deploy, and change SAM parameters/config.
- **SAM config**: Generates a `samconfig.toml` so `sam build` / `sam deploy` / `sam local start-api` work without extra flags.
- **VS Code Integration**: Includes a `launch.json` for easy debugging from VS Code.
- **Interactive CLI**: An interactive CLI to customize your project setup.
- **Organized Structure**: A clean and scalable project structure.
- **Extensible**: Easily add new handlers with a single command.
- **Modular Templates**: Internal templates for YAML and GraphQL schemas are now more modular and functional.

## 🧠 Tech Stack

- **Runtime**: Node.js 20.x
- **Framework**: None (vanilla Node.js)
- **Deployment**: AWS SAM
- **GraphQL**: `graphql` npm package
- **Linting**: ESLint

## ⚙️ Installation

No global installation needed. Just run it via **npx**:

```bash
npx create-lambda-graphql-app
```

---

## 🚀 Usage

### 🆕 Creating a New Project

To create a new project, simply run:

```bash
npx create-lambda-graphql-app cool-project-name
```

The CLI will guide you through the setup process — asking for the project name, folder structure, and initial handler creation.

---

## 📁 Project Structure

Your generated project will look like this:

```
├── .vscode/
│   └── launch.json
├── local-test/
│   └── your-handler/
│       ├── local-test.json
│       ├── local-test.mjs
├── handlers/
│   └── your-handler/
│       ├── index.mjs
│       ├── constants/
│       ├── dal/
│       ├── exceptions/
│       ├── helpers/
│       ├── transformers/
│       └── validators/
├── layers/common-dependency/
├── scripts/
│   └── deploy-assets.mjs
├── schema/
│   └── schema.graphql
├── mapping/
│   ├── request.vtl
│   └── response.vtl
├── template.yaml
├── samconfig.toml
├── README.md
├── .env
├── .prettierrc.json
├── .prettierignore
├── .npmignore
├── .gitignore
├── package.json
└── ...
```

### Folder Breakdown

- `handlers/`: Each folder is an independent Lambda function.
- `layers/common-dependency/`: Shared runtime deps packaged as a Lambda layer.
- `scripts/deploy-assets.mjs`: Uploads the schema + VTL templates to S3 before `sam deploy`.
- `schema/schema.graphql`: Your GraphQL schema definition.
- `mapping/`: AppSync request/response VTL mapping templates.
- `template.yaml`: The AWS SAM template that defines your Lambda functions and API.
- `samconfig.toml`: SAM CLI configuration (stack name, region, parameter overrides).
- `README.md`: Generated project docs — how to run, deploy, and change SAM props/config.

---

## 🧩 Add a Handler to Existing Project

You can add a new handler anytime without breaking your existing project.

```bash
npx create-lambda-graphql-app add <handler-name>
```

This command will:

1. Prompt for a handler name.
2. Create all standard subfolders (constants, dao, helpers, etc.).
3. Update `template.yaml` with the new function.
4. Update the GraphQL schema with new mutations/queries.

---

## 🎨 Formatting & Linting

This repo and every generated project use Prettier and ESLint:

```bash
npm run format        # prettier --write
npm run format:check  # verify formatting (use in CI)
npm run lint          # eslint (generated projects only)
```

---

## 🧰 Local Development

To run locally:

```bash
sam build
sam local start-api
```

---

## ☁️ Deployment

Deploy to AWS using the SAM CLI:

```bash
sam build
sam deploy --guided
```

You’ll be prompted for the stack name, AWS region, and other configuration details.

---

## 🤝 Contributing

Contributions are welcome!  
If you find a bug or want to suggest a feature, feel free to open an issue or submit a PR.

---

## 📄 License

This project is licensed under the **MIT License**.

---

### 💬 Author

Developed with ❤️ by **Jamal**  
GitHub: [@d3vjamal](https://github.com/d3vjamal)  
NPM: [create-lambda-graphql-app](https://www.npmjs.com/package/create-lambda-graphql-app)
