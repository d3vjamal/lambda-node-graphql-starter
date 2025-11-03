#!/usr/bin/env node

import { Command } from 'commander';
import { scaffoldProject } from '../lib/commands/scaffold-project.js';
import { addHandler } from '../lib/commands/add-handler.js';

const program = new Command();

program
  .name('lambda-node-graphql-starter')
  .description('Scaffold AWS Lambda + GraphQL + SAM projects')
  .version('1.0.0');

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
    const root = process.cwd();   // we are already inside the project folder
    await addHandler(root, handlerName);
  });

program.parse();