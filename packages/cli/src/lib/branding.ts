import chalk from 'chalk';

const orange = chalk.hex('#e05c00');

export const bannerLines = [
  '███████╗██╗     ██╗   ██╗ ██████╗ ███████╗',
  '██╔════╝██║     ██║   ██║██╔════╝ ██╔════╝',
  '███████╗██║     ██║   ██║██║  ███╗███████╗',
  '╚════██║██║     ██║   ██║██║   ██║╚════██║',
  '███████║███████╗╚██████╔╝╚██████╔╝███████║',
  '╚══════╝╚══════╝ ╚═════╝  ╚═════╝ ╚══════╝',
];

export const subtitle = 'terminal control center for autonomous trading agents';

export function printBrandHeader(): void {
  console.log();
  for (const line of bannerLines) {
    console.log(orange(line));
  }
  console.log();
  console.log(chalk.gray('  ' + subtitle));
  console.log();
  console.log(
    orange('> ') +
    chalk.gray('Welcome to ') +
    orange('SLUGS') +
    chalk.gray('. Type ') +
    orange('slugs --help') +
    chalk.gray(' to get started.')
  );
  console.log();
}