export async function serializeJsonWithBlobs(obj) {
  const isBlob = (obj) => obj instanceof Blob;
  const isDate = (obj) => obj instanceof Date;

  const serializeBlob = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64String = reader.result.split(",")[1];
        resolve({
          __isBlob: true,
          mimeType: blob.type,
          data: base64String,
        });
      };
      reader.onerror = reject;
    });

  const serializeObject = async (obj) => {
    if (Array.isArray(obj)) {
      return Promise.all(obj.map((item) => serializeObject(item)));
    }
    if (
      obj !== null &&
      typeof obj === "object" &&
      !isBlob(obj) &&
      !isDate(obj)
    ) {
      const entries = await Promise.all(
        Object.entries(obj).map(async ([key, value]) => {
          if (isBlob(value)) {
            return [key, await serializeBlob(value)];
          } else if (isDate(value)) {
            return [key, { __isDate: true, dateString: value.toISOString() }];
          } else if (value !== null && typeof value === "object") {
            return [key, await serializeObject(value)];
          }
          return [key, value];
        })
      );
      return Object.fromEntries(entries);
    }
    if (isDate(obj)) {
      return { __isDate: true, dateString: obj.toISOString() };
    }
    if (isBlob(obj)) {
      return await serializeBlob(obj);
    }
    return obj;
  };

  return JSON.stringify(await serializeObject(obj));
}

export function deserializeJsonWithBlobs(jsonString) {
  const obj = JSON.parse(jsonString);

  const deserializeBlob = ({ mimeType, data }) => {
    const byteCharacters = atob(data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const deserializeObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map((item) => deserializeObject(item));
    }
    if (obj && typeof obj === "object" && obj.__isDate) {
      return new Date(obj.dateString);
    }
    if (obj && typeof obj === "object" && obj.__isBlob) {
      return deserializeBlob(obj);
    }

    if (obj !== null && typeof obj === "object") {
      const entries = Object.entries(obj).map(([key, value]) => {
        if (value && typeof value === "object" && value.__isBlob) {
          return [key, deserializeBlob(value)];
        } else if (value && typeof value === "object" && value.__isDate) {
          return [key, new Date(value.dateString)];
        } else if (value && typeof value === "object") {
          return [key, deserializeObject(value)];
        }
        return [key, value];
      });
      return Object.fromEntries(entries);
    }
    return obj;
  };

  return deserializeObject(obj);
}
