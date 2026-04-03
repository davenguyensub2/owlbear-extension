export const generateId = (length = 4) => {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
};

export const proxyUrl = (url) => {
  if (!url || !url.includes("drive.google.com")) return url;

  const id = url.split("id=")[1] || url.split("/d/")[1]?.split("/")[0];
  return `https://lh3.googleusercontent.com/d/${id}`;
};

export const getImageDimensions = async (url) => {
  return await new Promise(async (resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth || 300, h: img.naturalHeight || 300 });
    };
    img.onerror = () => {
      console.warn(`Dùng size mặc định cho: ${url}`);
      resolve({ w: 300, h: 300 });
    };
    img.src = url;
    await sleep(100);
  });
};

export const isNear = (startPos, endPos, tolerance = 5) => {
  return (
    Math.abs(startPos.x - endPos.x) < tolerance &&
    Math.abs(startPos.y - endPos.y) < tolerance
  );
};

export const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const TRACKER_SETTINGS = {
  hp: { 
    desiredSize: { w: 4, h: 3.5 },
    textOffset: { x: 0.5, y: 0.5 },
    handleOffset: { x: 0.5, y: 1 },
  },
  default: { 
    desiredSize: { w: 3, h: 3 }, 
    textOffset: { x: 0.5, y: 0.05 },
    handleOffset: { x: 0.5, y: 1 },
  }
};