declare module "hex-string" {
  function encode(array: Uint8Array): string;
  function decode(string: string): Uint8Array;
}
