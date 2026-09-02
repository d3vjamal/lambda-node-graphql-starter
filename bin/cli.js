#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Command } from 'commander';
import { scaffoldProject } from '../lib/commands/scaffold-project.js';
import { addHandler } from '../lib/commands/add-handler.js';

const pkg = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('create-lambda-graphql-app')
  .description('Scaffold AWS Lambda + GraphQL + SAM projects')
  .version(pkg.version);

// ------------------------------------------------------------------
// Default → scaffold a brand-new project
// ------------------------------------------------------------------
program.action(async () => {
  await scaffoldProject();
});

// ------------------------------------------------------------------
// add <handlerName> → extend an existing project
// ------------------------------------------------------------------
program
  .command('add <handlerName>')
  .description('Add a new handler to an existing project')
  .action(async (handlerName) => {
    const root = process.cwd(); // we are already inside the project folder
    await addHandler(root, handlerName);
  });

program.parse();
