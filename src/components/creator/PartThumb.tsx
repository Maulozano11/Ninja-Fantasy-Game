import React, { useEffect, useRef } from 'react';
import type { PartsPreview } from '../../sprite/ctx';

/** An item on its own (its pixel rows and colours), drawn crisp: the part pickers' thumbnails. */
export const PartThumb: React.FC<{ art: PartsPreview; zoom?: number }> = ({ art, zoom = 2 }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const w = art.rows[0]?.length ?? 0;
  const h = art.rows.length;
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx || !w || !h) return;
    const img = ctx.createImageData(w, h);
    art.rows.forEach((row, y) => {
      for (let x = 0; x < w; x++) {
        const hex = row[x] === '.' ? undefined : art.colors[row[x]];
        if (!hex) continue;
        const i = (y * w + x) * 4;
        img.data[i] = parseInt(hex.slice(1, 3), 16);
        img.data[i + 1] = parseInt(hex.slice(3, 5), 16);
        img.data[i + 2] = parseInt(hex.slice(5, 7), 16);
        img.data[i + 3] = 255;
      }
    });
    ctx.putImageData(img, 0, 0);
  }, [art, w, h]);
  return <canvas ref={ref} width={w} height={h} style={{ width: w * zoom, maxWidth: '100%', imageRendering: 'pixelated' }} />;
};
