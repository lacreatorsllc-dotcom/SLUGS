import { Chalk } from 'chalk';
const brandChalk = new Chalk({ level: 3 });
const orange = brandChalk.hex('#ff5a00');
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
    return brandChalk.gray(leftPad + subtitle);
}
export function welcomeLine() {
    return (leftPad +
        orange('> ') +
        brandChalk.gray('Welcome to ') +
        orange('SLUGS') +
        brandChalk.gray('. Type ') +
        orange('slugs --help') +
        brandChalk.gray(' to get started.'));
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
