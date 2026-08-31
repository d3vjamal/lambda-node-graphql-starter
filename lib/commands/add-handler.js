import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import dedent from 'dedent';
import { createHandler } from './create-handler.js';
import { capitalize } from './scaffold-project.js';
import { yamlTemplate } from '../yamlTemplate.js';

// kebab-case → camelCase (valid GraphQL field / AppSync name)
const camelCase = (str) =>
    str.split('-').map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join('');

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
    const typeName = handlerName.startsWith('get-') ? 'Query' : 'Mutation';

    // Grab the *inside* of the {{#each handlers}}…{{/each}} block from template
    const blockInside = yamlTemplate.template
        .split('{{#each handlers}}')[1]
        .split('{{/each}}')[0];

    const newBlock = blockInside
        .replace(/{{capitalize this\.handlerName}}/g, cap)
        .replace(/{{typeName this\.handlerName}}/g, typeName)
        .replace(/{{fieldName this\.handlerName}}/g, camelCase(handlerName))
        .replace(/{{this\.handlerName}}/g, handlerName);

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

    const pascal = capitalize(handlerName);
    const inputType = `Input${pascal}`;
    const responseType = `${pascal}Response`;
    const fieldName = camelCase(handlerName);
    const inputArg = `input${pascal}`;
    const isQuery = handlerName.startsWith('get-');

    // ----- Input -----
    const inputBlock = dedent`
    # ── Input: ${handlerName} ──
    input ${inputType} {
      # TODO: Add ${isQuery ? 'filter' : 'required'} fields
      ${isQuery ? 'limit: Int' : 'title: String!'}
    }
  `;

    // ----- Response -----
    const responseBlock = dedent`
    # ── Response: ${handlerName} ──
    type ${responseType} {
      ${isQuery
            ? 'items: [AWSJSON]\n      totalCount: Int'
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
    const sectionLabel = isQuery ? 'Queries' : 'Mutations';

    const typeRegex = new RegExp(`(${targetSection}\\n[\\s\\S]*?type ${targetType} \\{\\n)([\\s\\S]*?)(\\n\\})`);

    if (typeRegex.test(schema)) {
        schema = schema.replace(typeRegex, `$1  ${fieldBlock.trim()}\n$2$3`);
    } else {
        // Section/type not present yet — append a fresh one.
        schema = schema.trimEnd() + `\n\n# ── ${sectionLabel} ──\ntype ${targetType} {\n  ${fieldBlock.trim()}\n}\n`;
    }

    await fs.writeFile(filePath, schema.trim() + '\n');
}