
import puter from "@heyputer/puter.js";
import { LAYOUTLENS_RENDER_PROMPT } from "./constants";

export const fetchAsDataUrl = async (url: string): Promise<string> => {
  if (url.startsWith("data:")) return url;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not convert image to data URL."));
      }
    };

    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.readAsDataURL(blob);
  });
};

export const generate3DView = async ({
  sourceImage,
}: Generate3DViewParams) => {
  if (!sourceImage) {
    throw new Error("Please provide a floor plan image.");
  }

  const dataUrl = sourceImage.startsWith("data:")
    ? sourceImage
    : await fetchAsDataUrl(sourceImage);

  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("The uploaded file is not a supported image.");
  }

  // Match the simpler request used by the working Welcome version.
  const response = await puter.ai.txt2img({
    prompt: LAYOUTLENS_RENDER_PROMPT,
    input_image: dataUrl,
    test_mode: false,
  });

  const rawImageUrl = (response as HTMLImageElement | null)?.src;

  if (!rawImageUrl) {
    throw new Error("Puter returned no generated image.");
  }

  const renderedImage = rawImageUrl.startsWith("data:")
    ? rawImageUrl
    : await fetchAsDataUrl(rawImageUrl);

  return {
    renderedImage,
    renderedPath: undefined,
  };
};
