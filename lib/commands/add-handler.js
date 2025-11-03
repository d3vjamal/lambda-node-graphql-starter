import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import dedent from 'dedent';
import { createHandler } from './create-handler.js';
import { capitalize } from './scaffold-project.js';
import { yamlTemplate } from '../yamlTemplate.js';

// ------------------------------------------------------------------
// Main entry point
// ------------------------------------------------------------------
export async function addHandler(root, handlerName) {

    // ----  Validate we are inside a generated project -----------------
    const templatePath = path.join(root, 'template.yaml');
    const schemaPath = path.join(root, 'schema/schema.graphql');

    if (!(await fs.pathExists(templatePath)) || !(await fs.pathExists(schemaPath))) {
        console.log(chalk.red('Error: Not inside a lambda-node-graphql-starter project.'));
        console.log(chalk.gray('Run the command inside a folder created by the CLI.'));
        process.exit(1);
    }

    console.log(chalk.cyan(`Adding handler "${handlerName}"…`));

    // ----  Create the handler folder (re-use existing logic) ---------
    await createHandler(root, handlerName);

    // ----  Update template.yaml --------------------------------------
    await appendHandlerToYaml(root, handlerName);

    // ----  Update schema.graphql --------------------------------------
    await appendHandlerToSchema(root, handlerName);

    console.log(chalk.green(`Handler "${handlerName}" added!`));
    console.log(chalk.gray(`
        Next steps:
        sam build
        sam deploy
        sam local start-api
        `));
}

// ------------------------------------------------------------------
// Append a new handler block to template.yaml
// ------------------------------------------------------------------
async function appendHandlerToYaml(root, handlerName) {
    const filePath = path.join(root, 'template.yaml');
    let yaml = await fs.readFile(filePath, 'utf-8');

    const cap = capitalize(handlerName);

    // Grab the *inside* of the {{#each handlers}}…{{/each}} block from template
    const blockInside = yamlTemplate.template
        .split('{{#each handlers}}')[1]
        .split('{{/each}}')[0];

    const newBlock = blockInside
        .replace(/{{this\.handlerName}}/g, handlerName)
        .replace(/{{capitalize this\.handlerName}}/g, cap);

    // Insert right before the "Outputs:" section (or at the end if missing)
    if (yaml.includes('Outputs:')) {
        yaml = yaml.replace(/Outputs:/, `${newBlock}\n\nOutputs:`);
    } else {
        yaml = yaml.trim() + '\n\n' + newBlock;
    }

    await fs.writeFile(filePath, yaml);
}

// ------------------------------------------------------------------
// Append input / response / field to schema.graphql
// ------------------------------------------------------------------
async function appendHandlerToSchema(root, handlerName) {
    const filePath = path.join(root, 'schema/schema.graphql');
    let schema = await fs.readFile(filePath, 'utf-8');

    const pascal = handlerName
        .split('-')
        .map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1)))
        .join('');
    const inputType = `Input${pascal}`;
    const responseType = `${pascal}Response`;
    const fieldName = handlerName;
    const inputArg = `input${pascal}`;
    const isQuery = handlerName.startsWith('get-');

    // ----- Input -----
    const inputBlock = dedent`
    # ── Input: ${handlerName} ──
    input ${inputType} {
      # TODO: Add required fields
      title: String!
    }
  `;

    // ----- Response -----
    const responseBlock = dedent`
    # ── Response: ${handlerName} ──
    type ${responseType} {
      ${isQuery
            ? 'incidents: [Incident]\n      totalCount: Int'
            : 'data: AWSJSON'}
      responseDetail: ResponseDetail!
    }
  `;

    // ----- Field -----
    const fieldBlock = dedent`
    ${fieldName}(${inputArg}: ${inputType}!): ${responseType}
      @aws_api_key
      @aws_lambda
      @aws_oidc
  `;

    // ---- Insert Input ----
    if (schema.includes('# ── Input Types ──')) {
        schema = schema.replace(
            /(# ── Input Types ──\n)([\s\S]*?)(?=\n# ── Response Types ──|$)/,
            `$1$2\n\n${inputBlock.trim()}\n`
        );
    } else {
        schema += `\n\n# ── Input Types ──\n${inputBlock.trim()}\n`;
    }

    // ---- Insert Response ----
    if (schema.includes('# ── Response Types ──')) {
        schema = schema.replace(
            /(# ── Response Types ──\n)([\s\S]*?)(?=\n# ── Shared Types ──|$)/,
            `$1$2\n\n${responseBlock.trim()}\n`
        );
    } else {
        schema += `\n\n# ── Response Types ──\n${responseBlock.trim()}\n`;
    }

    // ---- Insert Field (Query or Mutation) ----
    const targetSection = isQuery ? '# ── Queries ──' : '# ── Mutations ──';
    const targetType = isQuery ? 'Query' : 'Mutation';

    if (schema.includes(targetSection)) {
        schema = schema.replace(
            new RegExp(`(${targetSection}\\n.*?type ${targetType} \\{)([\\s\\S]*?)(\\})`, 'm'),
            `$1\n  ${fieldBlock.trim()}\n$2$3`
        );
    } else {
        // create the section if it does not exist yet
        schema = schema.replace(
            new RegExp(`type ${targetType}(?: \\{\\})?`),
            `type ${targetType} {\n  ${fieldBlock.trim()}\n}`
        );
    }

    await fs.writeFile(filePath, schema.trim() + '\n');
}