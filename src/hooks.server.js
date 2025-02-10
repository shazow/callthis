export async function handle({ event, resolve }) {
    return await resolve(event, {
        transformPageChunk: ({ html }) => {
            if (process.env.TRACK) {
                return html.replace(
                    '</head>',
                    `    <script id="counterscale-script" data-site-id="${process.env.TRACK}" src="https://counterscale.callthis.link/tracker.js" defer></script>\n    </head>`
                );
            }
            return html;
        }
    });
}
