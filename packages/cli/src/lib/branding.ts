export const orange = (text: string) => `\x1b[38;5;202m${text}\x1b[0m`;
const gray = (text: string) => `\x1b[90m${text}\x1b[0m`;
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
  return gray(leftPad + subtitle);
}

export function welcomeLine(): string {
  return (
    leftPad +
    orange('> ') +
    gray('Welcome to ') +
    orange('SLUGS') +
    gray('. Type ') +
    orange('slugs --help') +
    gray(' to get started.')
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
