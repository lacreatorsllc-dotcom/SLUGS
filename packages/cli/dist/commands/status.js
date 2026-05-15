import chalk from 'chalk';
import { loadProject, getProjectRoot } from '../lib/config.js';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
export function statusCommand(program) {
    program
        .command('status')
        .description('Show project status')
        .action(async () => {
        console.log();
        // Check for SLUGS project
        let project = loadProject();
        const root = getProjectRoot();
        // Try parent if cwd is inside the project
        if (!project && root !== process.cwd()) {
            const parentProjectPath = join(process.cwd(), 'slugs.json');
            if (existsSync(parentProjectPath)) {
                const content = readFileSync(parentProjectPath, 'utf-8');
                project = JSON.parse(content);
            }
        }
        if (!project) {
            console.log(chalk.red('✗  No SLUGS project found in this directory.'));
            console.log(chalk.dim('  Run "slugs init" to create one.'));
            console.log();
            process.exit(1);
        }
        // Count agents and skills
        const agentsDir = join(root, 'agents');
        const skillsDir = join(root, 'skills');
        const memoryDir = join(root, 'memory');
        let agentCount = 0;
        let skillCount = 0;
        let memoryCount = 0;
        try {
            if (existsSync(agentsDir)) {
                agentCount = readdirSync(agentsDir).filter(f => f.endsWith('.md')).length;
            }
            if (existsSync(skillsDir)) {
                skillCount = readdirSync(skillsDir).filter(f => f.endsWith('.md')).length;
            }
            if (existsSync(memoryDir)) {
                memoryCount = readdirSync(memoryDir).filter(f => f.endsWith('.log')).length;
            }
        }
        catch {
            // ignore
        }
        const modeColor = project.mode === 'paper_trading' ? chalk.hex('#ff7a00') :
            project.mode === 'live_trading' ? chalk.red :
                chalk.cyan;
        // Header box
        const { default: boxen } = await import('boxen');
        const header = boxen(chalk.bold.white(' SLUGS ') + chalk.dim('Terminal Control Center') + '\n' +
            chalk.dim(' Autonomous Trading Agents'), {
            borderColor: 'yellow',
            backgroundColor: 'black',
            borderStyle: 'round',
            padding: 1,
            margin: 1,
        });
        console.log(header);
        console.log();
        // Status table
        const status = [
            { label: 'Project', value: chalk.bold(project.name), color: null },
            { label: 'Mode', value: modeColor(project.mode), color: null },
            { label: 'Created', value: chalk.dim(project.createdAt?.split('T')[0] || '—'), color: null },
            { label: 'Agents', value: chalk.cyan(`${agentCount}`), color: null },
            { label: 'Skills', value: chalk.cyan(`${skillCount}`), color: null },
            { label: 'Memory Logs', value: chalk.cyan(`${memoryCount}`), color: null },
            { label: 'Directory', value: chalk.dim(root), color: null },
        ];
        const maxLabel = Math.max(...status.map(s => s.label.length));
        console.log(chalk.bold('  Status'));
        console.log(chalk.dim('  ' + '─'.repeat(50)));
        for (const item of status) {
            const padded = item.label.padEnd(maxLabel);
            console.log(chalk.dim(`  ${padded}`) + `  ${item.value}`);
        }
        console.log(chalk.dim('  ' + '─'.repeat(50)));
        console.log();
        // Health check
        const hasAgents = agentCount > 0;
        const health = hasAgents
            ? chalk.green('  ✓  Healthy — ready to run agents')
            : chalk.hex('#ff7a00')('  ⚠  No agents yet — run "slugs agent create <name>"');
        console.log(health);
        console.log();
    });
}
