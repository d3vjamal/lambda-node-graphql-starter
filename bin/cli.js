#!/usr/bin/env node
import chalk from 'chalk';
import { scaffoldProject } from '../lib/commands/scaffold-project.js';

async function run() {
  try {
    await scaffoldProject();
  } catch (err) {
    console.error(chalk.red('Error:'), err);
    process.exit(1);
  }
}

run();
