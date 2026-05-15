import chalk from 'chalk';
import ora from 'ora';
import { loadAgent } from '../lib/agent.js';
import { logActivity, getActivityLog } from '../lib/logger.js';
import { loadProject } from '../lib/config.js';
export function agentRunCommand(program) {
    program
        .command('agent run <name>')
        .description('Run an agent in paper trading mode')
        .action(async (name) => {
        const agent = loadAgent(name);
        if (!agent) {
            console.log(chalk.red(`✗  Agent "${name}" not found.`));
            process.exit(1);
        }
        const project = loadProject();
        if (!project) {
            console.log(chalk.red('✗  No SLUGS project found.'));
            process.exit(1);
        }
        console.log();
        console.log(chalk.cyan(`  ┌─ ${chalk.bold('LIVE')} ─ ${agent.name} ── ${agent.mode} ────────────┐`));
        console.log(chalk.cyan(`  │  Strategy: ${agent.purpose}`));
        console.log(chalk.cyan(`  │  Log: memory/${name}.log`));
        console.log(chalk.cyan(`  └──────────────────────────────────────────────┘`));
        console.log();
        logActivity(name, `=== SESSION STARTED (mode: ${project.mode}) ===`);
        logActivity(name, `Agent: ${agent.name} | Purpose: ${agent.purpose}`);
        const trades = [
            { pair: 'BTC/USDT', type: 'BUY', size: '0.05', price: '67,432.10' },
            { pair: 'ETH/USDT', type: 'SELL', size: '0.3', price: '3,891.50' },
            { pair: 'SOL/USDT', type: 'BUY', size: '1.2', price: '178.40' },
            { pair: 'BTC/USDT', type: 'SELL', size: '0.02', price: '67,510.00' },
        ];
        let tradeIndex = 0;
        const spinner = ora({
            text: chalk.hex('#ff7a00')('Scanning markets...'),
            spinner: 'dots',
            color: 'yellow',
        }).start();
        // Simulated trading loop
        const interval = setInterval(() => {
            if (tradeIndex >= trades.length) {
                clearInterval(interval);
                spinner.stop();
                console.log();
                console.log(chalk.hex('#ff7a00')('  ────────────────────────────────────'));
                console.log(chalk.green(`  ✓  Session complete — ${trades.length} simulated trades executed.`));
                console.log(chalk.dim(`  📄  Full log: memory/${name}.log`));
                console.log();
                logActivity(name, `=== SESSION ENDED (${trades.length} trades) ===`);
                // Show log snippet
                const log = getActivityLog(name);
                const lines = log.trim().split('\n').slice(-8);
                if (lines.length > 0) {
                    console.log(chalk.bold('  Recent activity:'));
                    for (const line of lines) {
                        console.log(chalk.dim(`  ${line}`));
                    }
                    console.log();
                }
                process.exit(0);
                return;
            }
            const trade = trades[tradeIndex];
            tradeIndex++;
            spinner.stop();
            console.log();
            console.log(chalk.green(`  ${trade.type.padEnd(5)}`) +
                chalk.white(`${trade.pair.padEnd(12)}`) +
                chalk.cyan(`${trade.size.padEnd(10)}`) +
                chalk.dim(`@ $${trade.price}`));
            console.log();
            logActivity(name, `${trade.type} ${trade.size} ${trade.pair} @ $${trade.price}`);
            // Reset spinner for next scan
            spinner.text = chalk.hex('#ff7a00')('Scanning next signal...');
            spinner.start();
        }, 1500);
    });
}
