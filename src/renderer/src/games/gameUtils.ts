const cache = new Map<string, HTMLImageElement>()

export function pxImage(name: string): HTMLImageElement {
  let img = cache.get(name)
  if (!img) {
    img = new Image()
    img.src = `./px/${name}.png`
    cache.set(name, img)
  }
  return img
}

export function drawPx(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, size = 32): void {
  const img = pxImage(name)
  if (img.complete && img.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, x, y, size, size)
  }
}

/** Draws the pet's idle frame (from the loaded skin sheet) into a game canvas. */
export function drawPetSprite(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  frameSize: number,
  x: number,
  y: number,
  size: number
): void {
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(sheet, 0, 0, frameSize, frameSize, x, y, size, size)
}
