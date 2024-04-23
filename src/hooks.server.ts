
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }: any) {
  const theme = event.cookies.get("theme");
  if (!theme) {
    return await resolve(event);
  }
  return await resolve(event, {
    transformPageChunk: ({ html }: any) => {
      return html.replace('data-theme=""', `data-theme="${theme}"`);
    },
  });
}