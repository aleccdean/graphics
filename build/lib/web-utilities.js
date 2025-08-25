export async function fetchText(url) {
    const response = await fetch(url);
    const text = await response.text();
    return text;
}
