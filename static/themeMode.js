
let cookies = document.cookie.split('; ');
let theme = cookies
    .filter(cookie => cookie.indexOf("theme=") === 0)
    .map(cookie => {
        let [key, value] = cookie.split('=');
        if (key === 'theme') return value;
    })[0];

if (theme) {
    document.documentElement.dataset.theme = theme;
}

