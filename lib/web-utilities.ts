export async function fetchText(url: string) {
    const response = await fetch(url);
    const text = await response.text();
    return text;
  }

export function downloadBlob(name: string, blob: Blob) {
  // Inject a link element into the page. Clicking on
  // it makes the browser download the binary data.
  let link = document.createElement('a');
  link.download = name;
  link.href = URL.createObjectURL(blob);
  document.body.appendChild(link);
  link.click();

  // Remove the link after a slight pause. Browsers...
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    document.body.removeChild(link);
  });
}

export async function takeScreenshot(canvas: HTMLCanvasElement) {
  const png: Blob = await new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob!), 'image/png');
  });
  downloadBlob('screenshot.png', png);
}

export async function fetchImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}