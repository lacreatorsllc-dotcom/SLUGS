import chalk from 'chalk';
import { bannerLines, subtitle } from './branding.js';

const orange = chalk.hex('#e05c00');

export function runStartupAnimation(): Promise<void> {
  return new Promise((resolve) => {
    // Respect skip flag
    if (process.env.SLUGS_NO_ANIMATION) {
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
      resolve();
      return;
    }

    // Only animate in interactive terminals
    if (!process.stdout.isTTY) {
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
        process.stdout.write(orange(line) + '\n');

        if (i === bannerLines.length - 1) {
          setTimeout(() => {
            process.stdout.write('\n');
            process.stdout.write(chalk.gray('  ' + subtitle) + '\n');
            process.stdout.write('\n');
            process.stdout.write(
              orange('> ') +
              chalk.gray('Welcome to ') +
              orange('SLUGS') +
              chalk.gray('. Type ') +
              orange('slugs --help') +
              chalk.gray(' to get started.') +
              '\n'
            );
            process.stdout.write('\n');
            process.stdout.write('\x1B[?25h');
            resolve();
          }, subtitleDelay);
        }
      }, (i + 1) * lineDelay);
    });
  });
}