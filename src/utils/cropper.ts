// Minimal crop helper inspired by react-easy-crop docs
export async function getCroppedCanvas(
  image: ImageBitmap,
  crop: { x: number; y: number; width: number; height: number },
  rotationDeg: number,
  outW: number,
  outH: number
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // We render by:
  // 1) Create an intermediate canvas with rotation applied around center.
  // 2) Draw cropped area from that intermediate into final canvas scaled.

  const iCanvas = document.createElement("canvas");
  iCanvas.width = image.width;
  iCanvas.height = image.height;
  const ictx = iCanvas.getContext("2d")!;
  ictx.save();
  ictx.translate(image.width / 2, image.height / 2);
  ictx.rotate((rotationDeg * Math.PI) / 180);
  ictx.translate(-image.width / 2, -image.height / 2);
  ictx.drawImage(image, 0, 0);
  ictx.restore();

  ctx.drawImage(
    iCanvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outW,
    outH
  );

  return canvas;
}
