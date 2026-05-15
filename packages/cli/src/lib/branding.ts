import chalk from 'chalk';

// Force truecolor so #ff5a00 renders distinctly (not quantized to 256-color index 208)
chalk.level = 3;

const orange = chalk.hex('#ff5a00');
const leftPad = '    ';

export const bannerLines = [
  '███████╗██╗     ██╗   ██╗ ██████╗ ███████╗',
  '██╔════╝██║     ██║   ██║██╔════╝ ██╔════╝',
  '███████╗██║     ██║   ██║██║  ███╗███████╗',
  '╚════██║██║     ██║   ██║██║   ██║╚════██║',
  '███████║███████╗╚██████╔╝╚██████╔╝███████║',
  '╚══════╝╚══════╝ ╚═════╝  ╚═════╝ ╚══════╝',
];

export const subtitle = 'terminal control center for autonomous trading agents';

export function logoLine(line: string): string {
  return orange(leftPad + line);
}

export function subtitleLine(): string {
  return chalk.gray(leftPad + subtitle);
}

export function welcomeLine(): string {
  return (
    leftPad +
    orange('> ') +
    chalk.gray('Welcome to ') +
    orange('SLUGS') +
    chalk.gray('. Type ') +
    orange('slugs --help') +
    chalk.gray(' to get started.')
  );
}

export function printBrandHeader(): void {
  console.log();
  for (const line of bannerLines) {
    console.log(logoLine(line));
  }
  console.log();
  console.log();
  console.log(subtitleLine());
  console.log();
  console.log(welcomeLine());
  console.log();
}