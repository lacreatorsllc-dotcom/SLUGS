import chalk from 'chalk';
import { bannerLines, logoLine, subtitleLine, welcomeLine } from './branding.js';
// Force truecolor so #ff5a00 renders distinctly (not quantized to 256-color index 208)
chalk.level = 3;
const orange = chalk.hex('#ff5a00');
export function runStartupAnimation() {
    return new Promise((resolve) => {
        // Respect skip flag
        if (process.env.SLUGS_NO_ANIMATION) {
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
            resolve();
            return;
        }
        // Only animate in interactive terminals
        if (!process.stdout.isTTY) {
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
            resolve();
            return;
        }
        // Clear terminal and hide cursor
        process.stdout.write('\x1Bc');
        process.stdout.write('\x1B[?25l');
        const lineDelay = 80;
        const subtitleDelay = 400;
        console.log();
        bannerLines.forEach((line, i) => {
            setTimeout(() => {
                process.stdout.write(logoLine(line) + '\n');
                if (i === bannerLines.length - 1) {
                    setTimeout(() => {
                        process.stdout.write('\n');
                        process.stdout.write('\n');
                        process.stdout.write(subtitleLine() + '\n');
                        process.stdout.write('\n');
                        process.stdout.write(welcomeLine() + '\n');
                        process.stdout.write('\n');
                        process.stdout.write('\x1B[?25h');
                        resolve();
                    }, subtitleDelay);
                }
            }, (i + 1) * lineDelay);
        });
    });
}
