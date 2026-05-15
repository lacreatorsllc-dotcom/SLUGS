import type { SlugProject } from './types.js';
export declare function getProjectRoot(): string;
export declare function projectExists(): boolean;
export declare function loadProject(): SlugProject | null;
export declare function saveProject(project: SlugProject): void;
export declare function createProject(name: string, mode?: SlugProject['mode']): SlugProject;
