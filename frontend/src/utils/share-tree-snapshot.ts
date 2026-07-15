interface ShareTreeSnapshotInput {
  treeName: string;
  relativesCount: number;
  shareUrl: string;
}

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

function pluralizeRelatives(count: number): string {
  return count === 1 ? "1 relative" : `${count} relatives`;
}

function sanitizeImageFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  return cleaned || "family-tree";
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): void {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (context.measureText(nextLine).width <= maxWidth) {
      line = nextLine;
      continue;
    }

    if (line) lines.push(line);
    line = word;

    if (lines.length === maxLines) break;
  }

  if (line && lines.length < maxLines) lines.push(line);

  lines.forEach((lineText, index) => {
    context.fillText(lineText, x, y + index * lineHeight);
  });
}

function createCanvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not create share image"));
      }
    }, "image/png");
  });
}

async function createSnapshotFile({
  treeName,
  relativesCount,
}: ShareTreeSnapshotInput): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create share image");
  }

  const bg = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, "#f4fbf7");
  bg.addColorStop(0.55, "#ffffff");
  bg.addColorStop(1, "#edf7ef");
  context.fillStyle = bg;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  context.fillStyle = "#0f9f6e";
  drawRoundedRect(context, 72, 70, 86, 86, 24);
  context.fill();

  context.fillStyle = "#ffffff";
  context.font = "700 42px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("M", 115, 113);

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#0f5f46";
  context.font = "700 36px Arial, sans-serif";
  context.fillText("MyRoots", 182, 112);

  context.fillStyle = "#6b756d";
  context.font = "500 24px Arial, sans-serif";
  context.fillText("Family tree snapshot", 182, 148);

  context.fillStyle = "#16231d";
  context.font = "700 66px Georgia, serif";
  drawWrappedText(context, treeName, 78, 270, 720, 74, 2);

  context.fillStyle = "#0a8f67";
  drawRoundedRect(context, 78, 420, 390, 96, 48);
  context.fill();

  context.fillStyle = "#ffffff";
  context.font = "800 42px Arial, sans-serif";
  context.fillText(pluralizeRelatives(relativesCount), 118, 482);

  context.fillStyle = "#4c5c53";
  context.font = "500 25px Arial, sans-serif";
  context.fillText("Explore this family tree on MyRoots", 78, 562);

  context.strokeStyle = "#cfe9d8";
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(770, 210);
  context.bezierCurveTo(850, 124, 1010, 130, 1080, 232);
  context.bezierCurveTo(1160, 350, 1044, 502, 904, 468);
  context.bezierCurveTo(780, 438, 694, 292, 770, 210);
  context.stroke();

  const nodes = [
    [908, 188, 34],
    [812, 296, 28],
    [1015, 306, 28],
    [904, 416, 30],
  ] as const;

  context.strokeStyle = "#aac8b2";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(908, 222);
  context.lineTo(812, 268);
  context.moveTo(908, 222);
  context.lineTo(1015, 278);
  context.moveTo(812, 324);
  context.lineTo(904, 386);
  context.moveTo(1015, 334);
  context.lineTo(904, 386);
  context.stroke();

  for (const [x, y, radius] of nodes) {
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#0f9f6e";
    context.lineWidth = 5;
    context.stroke();
  }

  const blob = await createCanvasBlob(canvas);
  return new File(
    [blob],
    `${sanitizeImageFilename(treeName)}-${relativesCount}-relatives.png`,
    { type: "image/png" },
  );
}

function buildShareText(input: ShareTreeSnapshotInput): string {
  return `Explore "${input.treeName}" on MyRoots — ${pluralizeRelatives(
    input.relativesCount,
  )} mapped.\n${input.shareUrl}`;
}

function downloadSnapshotFallback(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}

export async function shareTreeSnapshot(
  input: ShareTreeSnapshotInput,
): Promise<"native" | "whatsapp"> {
  const file = await createSnapshotFile(input);
  const text = buildShareText(input);

  if (
    navigator.share &&
    navigator.canShare?.({ files: [file] })
  ) {
    await navigator.share({
      title: input.treeName,
      text,
      url: input.shareUrl,
      files: [file],
    });
    return "native";
  }

  downloadSnapshotFallback(file);
  window.open(
    `https://wa.me/?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
  return "whatsapp";
}
