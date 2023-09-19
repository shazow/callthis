export function debouncer(
  handler: (...args: any[]) => void,
  delay: number = 500
): (...args: any[]) => void {
  let id : number;
  return function(...args: any[]) {
    window.clearTimeout(id);
    id = window.setTimeout(handler, delay, ...args);
  }
}
