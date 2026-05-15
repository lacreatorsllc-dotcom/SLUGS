import chalk from 'chalk';
const orange = chalk.ansi256(166);
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
export function logoLine(line) {
    return orange(leftPad + line);
}
export function subtitleLine() {
    return chalk.gray(leftPad + subtitle);
}
export function welcomeLine() {
    return (leftPad +
        orange('> ') +
        chalk.gray('Welcome to ') +
        orange('SLUGS') +
        chalk.gray('. Type ') +
        orange('slugs --help') +
        chalk.gray(' to get started.'));
}
export function printBrandHeader() {
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
