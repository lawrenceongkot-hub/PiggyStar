declare module "bcryptjs" {
export function hash(data: string, salt: number | string): Promise<string>;
export function compare(data: string, encrypted: string): Promise<boolean>;
export function hashSync(data: string, salt: number | string): string;
export function compareSync(data: string, encrypted: string): boolean;
export function genSalt(rounds?: number): Promise<string>;
export function genSaltSync(rounds?: number): string;
export function getRounds(hash: string): number;
export function getSalt(hash: string): string;
export const version: string;
export const defaults: { saltLength: number };
}
