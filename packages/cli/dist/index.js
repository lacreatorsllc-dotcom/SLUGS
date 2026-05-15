#!/usr/bin/env node
import { program } from 'commander';
import { initCommand } from './commands/init.js';
import { agentCommand } from './commands/agent.js';
import { statusCommand } from './commands/status.js';
import { runStartupAnimation } from './lib/animation.js';
import { orange } from './lib/branding.js';
// Run startup animation before anything else
(async () => {
    await runStartupAnimation();
    program
        .name('slugs')
        .description(orange('SLUGS CLI') + ' — Terminal control center for autonomous trading agents')
        .version('0.1.0', '-v, --version');
    // Register commands
    initCommand(program);
    agentCommand(program);
    statusCommand(program);
    if (process.argv.length <= 2) {
        program.outputHelp();
        return;
    }
    program.parse();
})();
