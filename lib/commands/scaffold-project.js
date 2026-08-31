import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { TEMPLATES } from '../templates.js';
import { createHandler } from './create-handler.js';
import { yamlTemplate } from '../yamlTemplate.js';
import dedent from 'dedent';
import { getBaseSchema } from '../schemaTemplate.js';

// Helper: kebab-case → PascalCase (first word lower for field, full for type)
const pascalCase = (str) =>
  str
    .split('-')
    .map((word, i) => (i === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join('');

export async function scaffoldProject() {
  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name (kebab-case)',
      validate: (i) => /^[a-z0-9-]+$/.test(i) || 'Only letters, numbers, hyphens'
    }
  ]);

  const { orgName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'orgName',
      message: 'Organization name (e.g. etihad):',
      default: 'your-org'
    }
  ]);

  const root = path.resolve(process.cwd(), projectName);
  if (await fs.pathExists(root)) {
    console.log(chalk.red(`Folder "${projectName}" already exists.`));
    process.exit(1);
  }

  console.log(chalk.cyan(`Scaffolding ${projectName}…`));

  // Root dirs
  const dirs = ['handlers', 'layers/common-dependency', 'local-test', 'mapping', 'schema', 'scripts', '.vscode'];
  for (const d of dirs) await fs.ensureDir(path.join(root, d));

  // Root files
  await fs.writeFile(path.join(root, '.gitignore'), TEMPLATES.gitignore);
  await fs.writeFile(path.join(root, '.npmignore'), TEMPLATES.npmignore);
  await fs.writeFile(path.join(root, '.env'), TEMPLATES.env);
  await fs.writeFile(path.join(root, 'eslint.config.mjs'), TEMPLATES.eslint);
  await fs.writeFile(path.join(root, 'package.json'), TEMPLATES.packageJson.replace(/{{name}}/g, projectName));
  await fs.writeFile(
    path.join(root, 'layers', 'common-dependency', 'package.json'),
    TEMPLATES.layerPackageJson.replace(/{{name}}/g, projectName)
  );
  await fs.writeFile(path.join(root, 'scripts', 'deploy-assets.mjs'), TEMPLATES.deployAssets.replace(/{{name}}/g, projectName));
  await fs.ensureDir(path.join(root, '.vscode'));
  await fs.writeFile(path.join(root, '.vscode', 'launch.json'), TEMPLATES.vscodeLaunchJson);
  await fs.writeFile(path.join(root, 'mapping', 'request.vtl'), TEMPLATES.requestVtl);
  await fs.writeFile(path.join(root, 'mapping', 'response.vtl'), TEMPLATES.responseVtl);

  // === Add Handlers ===
  const handlers = [];
  let addMore = true;
  while (addMore) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'handlerName',
        message: 'Handler folder name (kebab-case, e.g. register-student):',
        validate: (i) => /^[a-z0-9-]+$/.test(i) || 'Only letters, numbers, hyphens'
      },
      {
        type: 'confirm',
        name: 'more',
        message: 'Add another handler?',
        default: false
      }
    ]);
    await createHandler(root, answers.handlerName);
    handlers.push({ handlerName: answers.handlerName });
    addMore = answers.more;
  }

  // === Render template.yaml ===
  const renderedYaml = yamlTemplate.template
    .replace(/{{orgName}}/g, orgName)
    .replace(/{{name}}/g, projectName)
    .replace(/{{#each handlers}}([\s\S]*?){{\/each}}/g, (_, block) => {
      return handlers.map(h => {
        const cap = capitalize(h.handlerName);
        const typeName = h.handlerName.startsWith('get-') ? 'Query' : 'Mutation';
        return block
          .replace(/{{capitalize this\.handlerName}}/g, cap)
          .replace(/{{typeName this\.handlerName}}/g, typeName)
          .replace(/{{fieldName this\.handlerName}}/g, pascalCase(h.handlerName))
          .replace(/{{this\.handlerName}}/g, h.handlerName);
      }).join('\n');
    });

  await fs.writeFile(path.join(root, 'template.yaml'), renderedYaml);

  // === DYNAMIC SCHEMA BUILDER (Uses TEMPLATES.baseSchema) ===
  let fullSchema = getBaseSchema(); // <-- From your templates.js

  const queryHandlers = handlers.filter(h => h.handlerName.startsWith('get-'));
  const mutationHandlers = handlers.filter(h => !h.handlerName.startsWith('get-'));

  let queryFields = '';
  let mutationFields = '';
  let inputTypes = '';
  let responseTypes = '';

  // === Build Query Fields ===
  for (const h of queryHandlers) {
    const pascal = capitalize(h.handlerName);
    const inputType = `Input${pascal}`;
    const responseType = `${pascal}Response`;
    const fieldName = pascalCase(h.handlerName);
    const inputArg = `input${pascal}`;

    queryFields += dedent`
      ${fieldName}(${inputArg}: ${inputType}!): ${responseType}
        @aws_api_key
        @aws_lambda
        @aws_oidc
    `.trim() + '\n';

    inputTypes += dedent`

      # ── Input: ${h.handlerName} ──
      input ${inputType} {
        # TODO: Add filter fields
        limit: Int
        nextToken: String
      }
    `.trim() + '\n\n';

    responseTypes += dedent`

      # ── Response: ${h.handlerName} ──
      type ${responseType} {
        items: [AWSJSON]
        totalCount: Int
        responseDetail: ResponseDetail!
      }
    `.trim() + '\n\n';
  }

  // === Build Mutation Fields ===
  for (const h of mutationHandlers) {
    const pascal = capitalize(h.handlerName);
    const inputType = `Input${pascal}`;
    const responseType = `${pascal}Response`;
    const fieldName = pascalCase(h.handlerName);
    const inputArg = `input${pascal}`;

    mutationFields += dedent`
      ${fieldName}(${inputArg}: ${inputType}!): ${responseType}
        @aws_api_key
        @aws_lambda
        @aws_oidc
    `.trim() + '\n';

    inputTypes += dedent`

      # ── Input: ${h.handlerName} ──
      input ${inputType} {
        # TODO: Add required fields
        title: String!
      }
    `.trim() + '\n\n';

    responseTypes += dedent`

      # ── Response: ${h.handlerName} ──
      type ${responseType} {
        data: AWSJSON
        responseDetail: ResponseDetail!
      }
    `.trim() + '\n\n';
  }

  // === Append in Order ===
  const indentBlock = (s) =>
    s.trim().split('\n').map((l) => (l.trim() ? `  ${l}` : '')).join('\n');

  // AppSync requires a Query root type; emit a placeholder field when there are
  // no query handlers so the schema stays valid.
  fullSchema += '\n# ── Queries ──\ntype Query {\n';
  fullSchema += indentBlock(queryFields || '_ping: String');
  fullSchema += '\n}\n';

  if (mutationFields) {
    fullSchema += '\n# ── Mutations ──\ntype Mutation {\n';
    fullSchema += indentBlock(mutationFields);
    fullSchema += '\n}\n';
  }

  if (inputTypes) {
    fullSchema += '\n# ── Input Types ──\n';
    fullSchema += inputTypes.trim() + '\n';
  }

  if (responseTypes) {
    fullSchema += '\n# ── Response Types ──\n';
    fullSchema += responseTypes.trim() + '\n';
  }


  // === Write Schema ===
  await fs.writeFile(path.join(root, 'schema/schema.graphql'), fullSchema.trim() + '\n');

  console.log(chalk.green(`\nYour project "${projectName}" is ready! Start building cool stuff`));
  console.log(chalk.gray(`
Next:
  cd ${projectName}
  npm install
  npm run lint
  sam build
  npm run deploy:assets -- --org ${orgName} --env dev   # upload schema + VTL to S3
  sam deploy --guided
  sam local start-api
`));
}

// Helper: capitalize (for template.yaml)
export const capitalize = (s) =>
  s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('');