declare module "jsonwebtoken" {
export interface SignOptions {
algorithm?: string;
expiresIn?: string | number;
notBefore?: string | number;
audience?: string | string[];
issuer?: string;
subject?: string;
jwtid?: string;
noTimestamp?: boolean;
header?: object;
keyid?: string;
mutatePayload?: boolean;
}

export interface VerifyOptions {
algorithms?: string[];
audience?: string | string[];
issuer?: string | string[];
subject?: string;
jwtid?: string;
maxAge?: string | number;
clockTolerance?: number;
clockTimestamp?: number;
nonce?: string;
ignoreExpiration?: boolean;
complete?: boolean;
}

export interface JwtPayload {
[key: string]: any;
iss?: string;
sub?: string;
aud?: string | string[];
exp?: number;
nbf?: number;
iat?: number;
jti?: string;
}

export function sign(payload: string | object | Buffer, secretOrPrivateKey: string, options?: SignOptions): string;
export function sign(payload: string | object | Buffer, secretOrPrivateKey: string, callback: (err: Error | null, encoded: string) => void): void;
export function sign(
payload: string | object | Buffer,
secretOrPrivateKey: string,
options: SignOptions,
callback: (err: Error | null, encoded: string) => void,
): void;

export function verify(token: string, secretOrPublicKey: string, options?: VerifyOptions): JwtPayload | string;
export function verify(
token: string,
secretOrPublicKey: string,
callback: (err: VerifyErrors | null, decoded: any) => void,
): void;
export function verify(
token: string,
secretOrPublicKey: string,
options: VerifyOptions,
callback: (err: VerifyErrors | null, decoded: any) => void,
): void;

export interface VerifyErrors extends Error {
name: string;
message: string;
expiredAt?: Date;
inner?: Error;
}

export function decode(token: string, options?: { complete?: boolean; json?: boolean }): null | string | { [key: string]: any };
}
