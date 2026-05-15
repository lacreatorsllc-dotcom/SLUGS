export const orange = (text) => `\x1b[38;2;255;90;0m${text}\x1b[39m`;
const gray = (text) => `\x1b[90m${text}\x1b[39m`;
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
    return gray(leftPad + subtitle);
}
export function welcomeLine() {
    return (leftPad +
        orange('> ') +
        gray('Welcome to ') +
        orange('SLUGS') +
        gray('. Type ') +
        orange('slugs --help') +
        gray(' to get started.'));
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
