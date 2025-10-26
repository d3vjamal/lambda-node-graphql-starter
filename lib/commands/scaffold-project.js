import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { TEMPLATES } from '../templates.js';
import { createHandler } from './create-handler.js';

export async function scaffoldProject() {
  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name (kebab-case)',
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
  await fs.writeFile(path.join(root, 'schema/schema.graphql'), `# type Query { hello: String }
`);
  await fs.ensureDir(path.join(root, 'vscode'));
  await fs.writeFile(path.join(root, 'vscode', 'launch.json'), TEMPLATES.vscodeLaunchJson);
  await fs.ensureDir(path.join(root, 'mapping'));
  await fs.writeFile(path.join(root, 'mapping', 'request.vtl'), TEMPLATES.requestVtl);
  await fs.writeFile(path.join(root, 'mapping', 'response.vtl'), TEMPLATES.responseVtl);

  // === Add Handlers ===
  let addMore = true;
  while (addMore) {
    const answers = await inquirer.prompt([
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
    await createHandler(root, answers.handlerName);
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
`))
}