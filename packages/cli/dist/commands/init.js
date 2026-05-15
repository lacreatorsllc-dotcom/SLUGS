import chalk from 'chalk';
import inquirer from 'inquirer';
import { createProject, projectExists } from '../lib/config.js';
export function initCommand(program) {
    program
        .command('init')
        .description('Initialize a new SLUGS project')
        .option('-n, --name <name>', 'Project name', 'my-slugs-project')
        .option('-m, --mode <mode>', 'Trading mode: paper_trading or simulation', 'paper_trading')
        .action(async (options) => {
        if (projectExists()) {
            console.log(chalk.hex('#ff7a00')('⚠  SLUGS project already initialized in this directory.'));
            return;
        }
        let name = options.name;
        let mode = options.mode;
        // If running interactively (TTY), prompt for values
        if (process.stdin.isTTY) {
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: 'Project name:',
                    default: options.name,
                },
                {
                    type: 'list',
                    name: 'mode',
                    message: 'Trading mode:',
                    choices: [
                        { name: 'Paper Trading (safe simulation)', value: 'paper_trading' },
                        { name: 'Simulation (replay mode)', value: 'simulation' },
                    ],
                    default: options.mode,
                },
            ]);
            name = answers.name;
            mode = answers.mode;
        }
        else {
            console.log(chalk.dim(`  Using non-interactive mode`));
            console.log(chalk.dim(`  Name: ${name}`));
            console.log(chalk.dim(`  Mode: ${mode}`));
        }
        const project = createProject(name, mode);
        console.log();
        console.log(chalk.green('✓  Project initialized successfully!'));
        console.log();
        console.log(chalk.dim('  Created:'));
        console.log(chalk.dim('    • slugs.json    — Project config'));
        console.log(chalk.dim('    • agents/       — Agent definitions'));
        console.log(chalk.dim('    • skills/       — Skill marketplace'));
        console.log(chalk.dim('    • memory/       — Activity logs'));
        console.log(chalk.dim('    • .env          — Environment variables'));
        console.log();
        console.log(chalk.cyan('  Next steps:'));
        console.log(chalk.cyan('    slugs agent create <name>   — Create your first agent'));
        console.log(chalk.cyan('    slugs status                — Check project status'));
        console.log();
    });
}
