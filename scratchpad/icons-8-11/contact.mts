// Contact sheets for the owner's icon sheets 8 to 11: per sheet, each icon's row is his window (his
// own pixels, as cropped from his sheet), his window with the owner's edit (Command, Premonition),
// our 88, our 44 shown 2x; first at 1x, then the same row at 2x. And one sheet of the 14 icons inside
// the steel skill slot at 1x (44 in the 56 frame) and 2x (the @2x 88 in the frame doubled).
//
//   npx tsx contact.ts <worktree> <stageRoot> <debugDir> <outDir>

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [WT, STAGE, DEBUG, OUTDIR] = process.argv.slice(2);
const { Img, hex, loadPng, savePng } = await import(join(WT, 'tools/ui/ui-img.ts'));
const { screenText } = await import(join(WT, 'tools/ui/ui-font.ts'));

const SHEETS: Record<string, string[]> = {
  '8': ['ryusei_swap', 'northstar_command', 'northstar_submission'],
  '9': ['mirai_evasion', 'koton_block', 'koton_wall', 'ryusei_warp'],
  '10': ['dragon_fire_bomb', 'wood_dragon_jutsu', 'adamantine_sealing_chains', 'taki_sixtyfour_palms'],
  '11': ['shadow_clone', 'dragon_fire_stream', 'water_dragon_suiryuudan'],
};
const BG = hex('#15171d'), HEAD = hex('#e9dfc4'), SUB = hex('#9aa3b0');

/** Nearest-neighbour shrink of an image enlarged by a whole factor. */
function shrink(img: any, k: number): any {
  const o = new Img(img.w / k, img.h / k);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.set(x, y, img.get(x * k, y * k));
  return o;
}

function compose(parts: { img: any; x: number; y: number }[], pad = 24): any {
  const W = Math.max(...parts.map((p) => p.x + p.img.w)) + pad;
  const H = Math.max(...parts.map((p) => p.y + p.img.h)) + pad;
  const out = new Img(W, H);
  out.fill(BG);
  for (const p of parts) out.draw(p.img, p.x, p.y);
  return out;
}

const frame = loadPng(join(WT, 'src/assets/ui_icons/skill_slot_steel.png'));
const manifests: Record<string, any> = {};
for (const [sheet, ids] of Object.entries(SHEETS)) {
  const dir = join(STAGE, `ui_icons_${sheet}`);
  const man = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  manifests[sheet] = man;
  const parts: { img: any; x: number; y: number }[] = [];
  let y = 24;
  const title = screenText(`SHEET ${sheet} (icons-owner-reference-${sheet}.jpg): his window, ours at 88, ours at 44 shown 2x`, 'title', HEAD);
  parts.push({ img: title, x: 24, y });
  y += title.h + 16;
  for (const zoom of [1, 2]) {
    parts.push({ img: screenText(zoom === 1 ? 'At 1x (his window in his own pixels)' : 'The same at 2x', 'label', SUB), x: 24, y });
    y += 26;
    for (const id of ids) {
      const his = loadPng(join(dir, 'ref', `${id}.png`));
      const ours88 = loadPng(join(dir, `${id}@2x.png`));
      const ours44 = loadPng(join(dir, `${id}.png`));
      const ed = join(DEBUG, `${id}-edited-x4.png`);
      const edited = man.icons[id]?.edits && existsSync(ed) ? shrink(loadPng(ed), 4) : null;
      const cells: { img: any; label: string }[] = [{ img: his, label: `his window ${his.w}x${his.h}` }];
      if (edited) cells.push({ img: edited, label: 'his, with the edit' });
      cells.push({ img: ours88, label: 'ours 88' }, { img: ours44.scaled(2), label: 'ours 44 (2x)' });
      let x = 24;
      parts.push({ img: screenText(`${man.icons[id].label ?? ''}  ${id}`, 'label', HEAD), x, y });
      const rowY = y + 22;
      for (const c of cells) {
        const im = zoom === 1 ? c.img : c.img.scaled(2);
        parts.push({ img: im, x, y: rowY });
        parts.push({ img: screenText(c.label, 'label', SUB), x, y: rowY + im.h + 4 });
        x += Math.max(im.w, 150) + 16;
      }
      y = rowY + Math.max(...cells.map((c) => c.img.h * zoom)) + 30;
    }
  }
  savePng(join(OUTDIR, `contact-${sheet}.png`), compose(parts));
}

// The 14 icons in the steel slot: 1x (the 44 in the 56 frame) and 2x (the 88 in the frame doubled).
{
  const parts: { img: any; x: number; y: number }[] = [];
  let y = 24;
  const title = screenText('Sheets 8 to 11 in the steel skill slot: at 1x (the 44), then at 2x (the 88 file in the slot doubled)', 'title', HEAD);
  parts.push({ img: title, x: 24, y });
  y += title.h + 16;
  const all = Object.entries(SHEETS).flatMap(([s, ids]) => ids.map((id) => ({ s, id })));
  const slot1 = (s: string, id: string) => {
    const o = new Img(56, 56);
    o.draw(loadPng(join(STAGE, `ui_icons_${s}`, `${id}.png`)), 6, 6);
    o.draw(frame, 0, 0);
    return o;
  };
  const slot2 = (s: string, id: string) => {
    const o = new Img(112, 112);
    o.draw(loadPng(join(STAGE, `ui_icons_${s}`, `${id}@2x.png`)), 12, 12);
    o.draw(frame.scaled(2), 0, 0);
    return o;
  };
  // 1x: one row of 14 on the bar's dark ground.
  let x = 24;
  for (const { s, id } of all) {
    parts.push({ img: slot1(s, id), x, y });
    x += 60;
  }
  y += 56 + 24;
  // 2x: two rows of 7, with his labels.
  for (let r = 0; r < 2; r++) {
    x = 24;
    for (const { s, id } of all.slice(r * 7, r * 7 + 7)) {
      parts.push({ img: slot2(s, id), x, y });
      parts.push({ img: screenText(manifests[s].icons[id].label ?? id, 'label', SUB), x, y: y + 116 });
      x += 132;
    }
    y += 112 + 40;
  }
  savePng(join(OUTDIR, 'slots-8-11.png'), compose(parts));
}
console.log('contact sheets written to', OUTDIR);
