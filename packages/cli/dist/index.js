#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { agentCommand } from './commands/agent.js';
import { statusCommand } from './commands/status.js';
import { runStartupAnimation } from './lib/animation.js';
// Run startup animation before anything else
(async () => {
    await runStartupAnimation();
    program
        .name('slugs')
        .description(chalk.bold('SLUGS CLI') + ' — Terminal control center for autonomous trading agents')
        .version('0.1.0', '-v, --version');
    // Register commands
    initCommand(program);
    agentCommand(program);
    statusCommand(program);
    program.parse();
})();
