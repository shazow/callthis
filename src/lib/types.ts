export type Params = {
  from: string,
  to: string,
  calldata: string,
  args: Record<string, string[]>,
  value: string,
  hint: string,
  chainid: number,
};
