import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { saveAgent, agentExists, listAgents, loadAgent } from '../lib/agent.js';
import type { AgentConfig } from '../lib/types.js';
import { logActivity, getActivityLog } from '../lib/logger.js';
import { loadProject } from '../lib/config.js';

export function agentCommand(program: Command): void {
  const agent = program.command('agent');

// agent create <name>
   agent
     .command('create <name>')
     .description('Create a new trading agent')
     .option('-p, --purpose <purpose>', 'Agent purpose / objective')
     .option('-m, --mode <mode>', 'Trading mode: paper_trading or live_trading', 'paper_trading')
     .action(async (name: string, options: { purpose?: string; mode: string }) => {
       const project = loadProject();
       if (!project) {
         console.log(chalk.red('✗  No SLUGS project found. Run "slugs init" first.'));
         process.exit(1);
       }

       if (agentExists(name)) {
         console.log(chalk.red(`✗  Agent "${name}" already exists.`));
         process.exit(1);
       }

       console.log();
       console.log(chalk.cyan(`  Creating agent: ${chalk.bold(name)}`));
       console.log(chalk.dim('  ─────────────────────────────'));
       console.log();

       let purpose = options.purpose;
       let mode: 'paper_trading' | 'live_trading' = options.mode as any;

       // If running interactively (TTY) and purpose not provided, prompt
       if (process.stdin.isTTY && !purpose) {
         const answers = await inquirer.prompt([
           {
             type: 'input',
             name: 'purpose',
             message: 'Purpose / objective:',
             default: `Autonomous trading agent for ${name}`,
           },
           {
             type: 'list',
             name: 'mode',
             message: 'Trading mode:',
             choices: [
               { name: 'Paper Trading', value: 'paper_trading' },
               { name: 'Live Trading', value: 'live_trading' },
             ],
             default: options.mode,
           },
         ]);
         purpose = answers.purpose;
         mode = answers.mode;
       } else if (!purpose) {
         purpose = `Autonomous trading agent for ${name}`;
}

        const agentConfig: AgentConfig = {
          name,
          purpose: purpose ?? `Autonomous trading agent for ${name}`,
          createdAt: new Date().toISOString(),
          mode,
        };

        saveAgent(agentConfig);

      console.log();
      console.log(chalk.green(`✓  Agent "${name}" created successfully.`));
      console.log();
      console.log(chalk.dim(`  Mode: ${mode}`));
      console.log(chalk.dim(`  Purpose: ${purpose}`));
      console.log();
      console.log(chalk.cyan('  Try it:'));
      console.log(chalk.cyan(`    slugs agent chat ${name}`));
      console.log(chalk.cyan(`    slugs agent run ${name}`));
      console.log();
    });

  // agent list
  agent
    .command('list')
    .description('List all agents')
    .action(() => {
      const agents = listAgents();
      const project = loadProject();

      console.log();
      if (agents.length === 0) {
        console.log(chalk.dim('  No agents yet. Create one with: slugs agent create <name>'));
        console.log();
        return;
      }

      console.log(chalk.bold('  ┌─────────────────────────────────────────────────────┐'));
      console.log(chalk.bold('  │') + chalk.cyan('  AGENTS') + chalk.bold('                                              │'));
      console.log(chalk.bold('  ├─────────────────────────────────────────────────────┤'));

      for (const a of agents) {
        const modeColor = a.mode === 'live_trading' ? chalk.red : chalk.hex('#ff7a00');
        console.log(
          chalk.bold('  │') +
          ` ${chalk.white(a.name.padEnd(20))}` +
          `${modeColor(`[${a.mode}]`.padEnd(17))}` +
          chalk.dim(a.purpose.substring(0, 30).padEnd(30)) +
          chalk.bold('│')
        );
      }

      console.log(chalk.bold('  └─────────────────────────────────────────────────────┘'));
      console.log();
      console.log(chalk.dim(`  ${agents.length} agent${agents.length !== 1 ? 's' : ''} total`));
      if (project) {
        console.log(chalk.dim(`  Project mode: ${project.mode}`));
      }
      console.log();
    });

  // agent chat <name>
  agent
    .command('chat <name>')
    .description('Chat with an agent')
    .action(async (name: string) => {
      const agent = loadAgent(name);
      if (!agent) {
        console.log(chalk.red(`✗  Agent "${name}" not found.`));
        process.exit(1);
      }

      console.log();
      console.log(chalk.cyan(`  ┌─ ${chalk.bold('SLUGS Chat')} ─ ${agent.name} ─────────────┐`));
      console.log(chalk.cyan(`  │  Mode: ${agent.mode}`));
      console.log(chalk.cyan(`  │  Purpose: ${agent.purpose}`));
      console.log(chalk.cyan(`  └──────────────────────────────────────┘`));
      console.log();
      console.log(chalk.dim('  Type your message (or "exit" to quit)'));
      console.log();

      // Placeholder for AI integration — swap with OpenRouter client later
      const mockResponses = [
        `Processing your query through ${agent.model || 'default'} model...`,
        `Analyzing market conditions for ${agent.name}...`,
        `Strategy check: signals aligned with ${agent.purpose}.`,
        `Scanning indicators — no immediate action recommended.`,
        `Paper trade logged. Confidence: ${(Math.random() * 40 + 60).toFixed(1)}%`,
      ];

      let mockIndex = 0;

      const readline = await import('node:readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk.hex('#ff7a00')('  you › '),
      });

      rl.prompt();

      rl.on('line', (line: string) => {
        const input = line.trim();

        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
          console.log();
          console.log(chalk.dim('  Session ended.'));
          rl.close();
          process.exit(0);
        }

        if (input) {
          console.log();
          console.log(chalk.dim(`  [${new Date().toLocaleTimeString()}] You: ${input}`));
          console.log();

          const response = mockResponses[mockIndex % mockResponses.length];
          mockIndex++;

          setTimeout(() => {
            console.log(chalk.green(`  ${chalk.bold(agent.name)}:`));
            console.log(`  ${response}`);
            console.log();
            rl.prompt();
          }, 500 + Math.random() * 800);
        } else {
          rl.prompt();
        }
      }).on('close', () => {
        console.log();
        process.exit(0);
      });
    });

  // agent run <name>
  agent
    .command('run <name>')
    .description('Run an agent in paper trading mode')
    .action(async (name: string) => {
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
        console.log(
          chalk.green(`  ${trade.type.padEnd(5)}`) +
          chalk.white(`${trade.pair.padEnd(12)}`) +
          chalk.cyan(`${trade.size.padEnd(10)}`) +
          chalk.dim(`@ $${trade.price}`)
        );
        console.log();

        logActivity(name, `${trade.type} ${trade.size} ${trade.pair} @ $${trade.price}`);

        // Reset spinner for next scan
        spinner.text = chalk.hex('#ff7a00')('Scanning next signal...');
        spinner.start();
      }, 1500);
    });
}