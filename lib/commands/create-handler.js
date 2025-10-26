import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { TEMPLATES } from '../templates.js';
import { capitalize } from '../utils.js';

export async function createHandler(root, handlerName) {
  const hPath = path.join(root, 'handlers', handlerName);
  await fs.ensureDir(hPath);

  const cap = capitalize(handlerName);
  const replace = (tmpl) =>
    tmpl
      .replace(/{{handlerName}}/g, handlerName)
      .replace(/{{capitalizeHandler}}/g, cap);

  // Handler files
  await fs.writeFile(path.join(hPath, 'index.mjs'), replace(TEMPLATES.handlerIndex));
  await fs.ensureDir(path.join(hPath, 'constants'));
  await fs.writeFile(path.join(hPath, 'constants', 'constants.mjs'), replace(TEMPLATES.constants));
  await fs.ensureDir(path.join(hPath, 'dal'));
  await fs.writeFile(path.join(hPath, 'dal', `${handlerName}-dao.mjs`), replace(TEMPLATES.dao));
  await fs.ensureDir(path.join(hPath, 'exceptions'));
  await fs.writeFile(path.join(hPath, 'exceptions', 'exceptions.mjs'), replace(TEMPLATES.exceptions));
  await fs.ensureDir(path.join(hPath, 'helpers'));
  await fs.writeFile(path.join(hPath, 'helpers', `${handlerName}-helper.mjs`), replace(TEMPLATES.helper));
  await fs.ensureDir(path.join(hPath, 'transformers'));
  await fs.writeFile(path.join(hPath, 'transformers', `${handlerName}-transformer.mjs`), replace(TEMPLATES.transformer));
  await fs.ensureDir(path.join(hPath, 'validators'));
  await fs.writeFile(path.join(hPath, 'validators', 'request-validator.mjs'), replace(TEMPLATES.requestValidator));

  // MAPPING (once)
  const mappingDir = path.join(root, 'mapping');
  await fs.ensureDir(mappingDir);
  await fs.writeFile(path.join(mappingDir, 'request.vtl'), TEMPLATES.requestVtl);
  await fs.writeFile(path.join(mappingDir, 'response.vtl'), TEMPLATES.responseVtl);

  // LOCAL-TEST (per handler)
  const localTestDir = path.join(root, 'local-test', handlerName);
  await fs.ensureDir(localTestDir);
  await fs.writeFile(path.join(localTestDir, 'local-test.json'), replace(TEMPLATES.localTestJson));
  await fs.writeFile(path.join(localTestDir, 'local-test.mjs'), replace(TEMPLATES.localTestMjs));

  // VSCODE LAUNCH.JSON
  const launchJsonPath = path.join(root, '.vscode', 'launch.json');
  let launchConfig = { version: '0.2.0', configurations: [] };
  if (await fs.pathExists(launchJsonPath)) {
    launchConfig = await fs.readJson(launchJsonPath);
  }
  const newConfig = JSON.parse(replace(TEMPLATES.vscodeLaunchJson));
  launchConfig.configurations.push(newConfig.configurations[0]);
  await fs.writeJson(launchJsonPath, launchConfig, { spaces: 4 });

  console.log(chalk.blue(`Handler "${handlerName}" created successfully!`));
}
