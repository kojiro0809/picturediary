'use client';

import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Cloud, Download, ImagePlus, Move, RotateCcw, Sun, Umbrella } from 'lucide-react';
import NextImage from 'next/image';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';

type Weather = 'sunny' | 'rainy' | 'cloudy';

const weatherOptions: { id: Weather; label: string; Icon: typeof Sun }[] = [
  { id: 'sunny', label: 'はれ', Icon: Sun },
  { id: 'rainy', label: '雨', Icon: Umbrella },
  { id: 'cloudy', label: 'くもり', Icon: Cloud },
];

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1800;
const PAGE_MARGIN = 88;
const INNER_WIDTH = CANVAS_WIDTH - PAGE_MARGIN * 2;
const INNER_HEIGHT = CANVAS_HEIGHT - PAGE_MARGIN * 2;
const PHOTO_HEIGHT = 54;
const PHOTO_HEIGHT_PX = Math.round((INNER_HEIGHT * PHOTO_HEIGHT) / 100);
const META_WIDTH = 116;
const TEXT_COLUMNS = 10;
const TEXT_ROWS = 15;
const TEXT_TOP = 68;
const TEXT_BOTTOM = 34;

function layoutVerticalText(value: string) {
  const columns = Array.from({ length: TEXT_COLUMNS }, () => [] as string[]);
  let column = 0;
  let row = 0;
  for (const character of Array.from(value)) {
    if (character === '\n') {
      column += 1;
      row = 0;
      if (column >= TEXT_COLUMNS) break;
      continue;
    }
    if (row >= TEXT_ROWS) {
      column += 1;
      row = 0;
    }
    if (column >= TEXT_COLUMNS) break;
    columns[column].push(character);
    row += 1;
  }
  return columns;
}

function todayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatJapaneseDateParts(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return [];
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return [...Array.from(`${date.getMonth() + 1}月${date.getDate()}日`), `（${weekdays[date.getDay()]}）`];
}

function drawWeather(ctx: CanvasRenderingContext2D, weather: Weather, x: number, y: number, size: number) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.075);
  if (weather === 'sunny') {
    ctx.strokeStyle = '#dc9a22';
    ctx.fillStyle = '#f3bc3d';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.24, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * size * 0.36, y + Math.sin(angle) * size * 0.36);
      ctx.lineTo(x + Math.cos(angle) * size * 0.48, y + Math.sin(angle) * size * 0.48);
      ctx.stroke();
    }
  } else if (weather === 'rainy') {
    ctx.strokeStyle = '#4a7198';
    ctx.fillStyle = '#7ca5c7';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, Math.PI, Math.PI * 2);
    ctx.lineTo(x + size * 0.4, y);
    ctx.quadraticCurveTo(x + size * 0.2, y - size * 0.12, x, y);
    ctx.quadraticCurveTo(x - size * 0.2, y - size * 0.12, x - size * 0.4, y);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + size * 0.4);
    ctx.quadraticCurveTo(x, y + size * 0.52, x + size * 0.13, y + size * 0.48);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#7d8790';
    ctx.fillStyle = '#b6bec4';
    ctx.beginPath();
    ctx.arc(x - size * 0.18, y, size * 0.22, Math.PI, Math.PI * 2);
    ctx.arc(x + size * 0.02, y - size * 0.09, size * 0.28, Math.PI, Math.PI * 2);
    ctx.arc(x + size * 0.25, y, size * 0.2, Math.PI, Math.PI * 2);
    ctx.lineTo(x + size * 0.45, y + size * 0.17);
    ctx.lineTo(x - size * 0.4, y + size * 0.17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function DiaryMaker() {
  const [date, setDate] = useState(todayInputValue);
  const [weather, setWeather] = useState<Weather>('sunny');
  const [text, setText] = useState('きょうは公園で、きれいな花を見つけました。');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoImage, setPhotoImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  const formattedDateParts = formatJapaneseDateParts(date);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setPhotoImage(image);
      setPhotoUrl(url);
      setZoom(1);
      setPositionX(0);
      setPositionY(0);
      setNotice('写真を読み込みました');
      window.setTimeout(() => setNotice(''), 2200);
    };
    image.src = url;
  }

  function startDrag(event: ReactPointerEvent<Element>) {
    if (!photoImage) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, startX: positionX, startY: positionY };
  }

  function movePhoto(event: ReactPointerEvent<Element>) {
    if (!drag.current) return;
    const nextX = drag.current.startX + (event.clientX - drag.current.x) * 0.7;
    const nextY = drag.current.startY + (event.clientY - drag.current.y) * 0.7;
    setPositionX(Math.max(-100, Math.min(100, nextX)));
    setPositionY(Math.max(-100, Math.min(100, nextY)));
  }

  function endDrag() {
    drag.current = null;
  }

  function drawVerticalText(ctx: CanvasRenderingContext2D, value: string, left: number, top: number, width: number, height: number) {
    const fontSize = 41;
    const columns = layoutVerticalText(value);
    const columnWidth = width / TEXT_COLUMNS;
    const rowHeight = height / TEXT_ROWS;
    ctx.save();
    ctx.fillStyle = '#27231f';
    const diaryFont = getComputedStyle(document.documentElement).getPropertyValue('--font-diary').trim();
    ctx.font = `700 ${fontSize}px ${diaryFont || '"Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    columns.forEach((characters, column) => characters.forEach((character, row) => {
      const x = left + width - (column + 0.5) * columnWidth;
      const y = top + (row + 0.5) * rowHeight;
      ctx.fillText(character, x, y);
    }));
    ctx.restore();
  }

  function renderCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable');

    ctx.fillStyle = '#fffefa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const margin = PAGE_MARGIN;
    const innerX = margin;
    const innerY = margin;
    const innerW = canvas.width - margin * 2;
    const innerH = canvas.height - margin * 2;
    const photoH = PHOTO_HEIGHT_PX;
    const metaW = META_WIDTH;
    const writingTop = innerY + photoH;

    ctx.save();
    ctx.beginPath();
    ctx.rect(innerX, innerY, innerW, photoH);
    ctx.clip();
    ctx.fillStyle = '#f1ede5';
    ctx.fillRect(innerX, innerY, innerW, photoH);
    if (photoImage) {
      const baseScale = Math.max(innerW / photoImage.naturalWidth, photoH / photoImage.naturalHeight);
      const scale = baseScale * zoom;
      const drawW = photoImage.naturalWidth * scale;
      const drawH = photoImage.naturalHeight * scale;
      const travelX = Math.abs(drawW - innerW) / 2;
      const travelY = Math.abs(drawH - photoH) / 2;
      const centerX = innerX + innerW / 2 + (positionX / 100) * travelX;
      const centerY = innerY + photoH / 2 + (positionY / 100) * travelY;
      ctx.drawImage(photoImage, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
    } else {
      ctx.fillStyle = '#91897e';
      const diaryFont = getComputedStyle(document.documentElement).getPropertyValue('--font-diary').trim();
      ctx.font = `700 30px ${diaryFont || '"Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.fillText('ここに写真が入ります', canvas.width / 2, innerY + photoH / 2);
    }
    ctx.restore();

    ctx.strokeStyle = '#8f8a82';
    ctx.lineWidth = 2;
    ctx.strokeRect(innerX, innerY, innerW, innerH);
    ctx.beginPath();
    ctx.moveTo(innerX, writingTop);
    ctx.lineTo(innerX + innerW, writingTop);
    ctx.moveTo(innerX + innerW - metaW, writingTop);
    ctx.lineTo(innerX + innerW - metaW, innerY + innerH);
    for (let i = 1; i < 10; i += 1) {
      const x = innerX + ((innerW - metaW) * i) / 10;
      ctx.moveTo(x, writingTop);
      ctx.lineTo(x, innerY + innerH);
    }
    ctx.stroke();

    drawVerticalText(ctx, text, innerX, writingTop + TEXT_TOP, innerW - metaW, innerH - photoH - TEXT_TOP - TEXT_BOTTOM);

    const metaCenter = innerX + innerW - metaW / 2;
    ctx.fillStyle = '#27231f';
    const diaryFont = getComputedStyle(document.documentElement).getPropertyValue('--font-diary').trim();
    ctx.font = `700 29px ${diaryFont || '"Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif'}`;
    ctx.textAlign = 'center';
    formattedDateParts.forEach((part, index) => {
      ctx.font = part.startsWith('（')
        ? `700 22px ${diaryFont || '"Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif'}`
        : `700 29px ${diaryFont || '"Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif'}`;
      ctx.fillText(part, metaCenter, writingTop + 72 + index * 38);
    });
    const labelY = Math.min(innerY + innerH - 130, writingTop + 72 + formattedDateParts.length * 38 + 28);
    ctx.font = `700 23px ${diaryFont || '"Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif'}`;
    ctx.fillText('天', metaCenter, labelY);
    ctx.fillText('気', metaCenter, labelY + 26);
    drawWeather(ctx, weather, metaCenter, innerY + innerH - 55, 56);
    return canvas;
  }

  useEffect(() => {
    let active = true;
    const drawPreview = () => {
      if (!active || !previewCanvas.current) return;
      const rendered = renderCanvas();
      const preview = previewCanvas.current;
      const context = preview.getContext('2d');
      if (!context) return;
      preview.width = CANVAS_WIDTH;
      preview.height = CANVAS_HEIGHT;
      context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      context.drawImage(rendered, 0, 0);
    };
    drawPreview();
    void document.fonts.ready.then(drawPreview);
    return () => { active = false; };
  });

  async function saveDiary() {
    setSaving(true);
    try {
      await document.fonts.ready;
      const canvas = renderCanvas();
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1));
      if (!blob) throw new Error('画像を作成できませんでした');
      const file = new File([blob], `絵日記-${date || 'today'}.png`, { type: 'image/png' });
      const mobileShare = typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] }) === true;
      if (mobileShare) {
        await navigator.share({ files: [file], title: 'まいにち絵日記', text: '作った絵日記です' });
        setNotice('共有メニューから「画像を保存」を選べます');
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice('絵日記をPNG画像で保存しました');
      }
      window.setTimeout(() => setNotice(''), 3000);
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') setNotice('保存できませんでした。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  }

  const photoPlacement = photoImage ? (() => {
    const frameAspect = INNER_WIDTH / PHOTO_HEIGHT_PX;
    const imageAspect = photoImage.naturalWidth / photoImage.naturalHeight;
    const baseWidth = imageAspect >= frameAspect ? (imageAspect / frameAspect) * 100 : 100;
    const baseHeight = imageAspect >= frameAspect ? 100 : (frameAspect / imageAspect) * 100;
    const width = baseWidth * zoom;
    const height = baseHeight * zoom;
    const travelX = Math.abs(width - 100) / 2;
    const travelY = Math.abs(height - 100) / 2;
    return {
      width,
      height,
      left: 50 + (positionX / 100) * travelX,
      top: 50 + (positionY / 100) * travelY,
    };
  })() : null;

  function renderPhotoCropFrame(compact = false) {
    return (
      <div
        className={`relative grid size-full touch-none place-items-center overflow-hidden bg-[#f2eee5] text-center text-[#91897e] ${photoImage ? 'cursor-grab active:cursor-grabbing' : ''} ${compact ? 'rounded-2xl border-2 border-[#8f8a82] shadow-[0_12px_30px_rgba(78,61,40,.15)]' : ''}`}
        onPointerDown={startDrag}
        onPointerMove={movePhoto}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {photoUrl ? (
          <NextImage
            src={photoUrl}
            alt="選択した写真"
            draggable={false}
            width={photoImage?.naturalWidth || 1}
            height={photoImage?.naturalHeight || 1}
            unoptimized
            className="absolute max-w-none select-none will-change-transform"
            style={{ width: `${photoPlacement?.width ?? 100}%`, height: `${photoPlacement?.height ?? 100}%`, left: `${photoPlacement?.left ?? 50}%`, top: `${photoPlacement?.top ?? 50}%`, transform: 'translate(-50%, -50%)' }}
          />
        ) : (
          <button onClick={() => fileInput.current?.click()} className="relative z-10 p-4">
            <ImagePlus className="mx-auto mb-2 size-8" strokeWidth={1.5} />
            <p className="text-sm font-bold">タップして写真を選ぶ</p>
          </button>
        )}
        {photoUrl && <span className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white"><Move className="size-3" />指で動かせます</span>}
      </div>
    );
  }

  function startPreviewDrag(event: ReactPointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeY = (event.clientY - bounds.top) / bounds.height;
    const photoTop = PAGE_MARGIN / CANVAS_HEIGHT;
    const photoBottom = (PAGE_MARGIN + PHOTO_HEIGHT_PX) / CANVAS_HEIGHT;
    if (relativeY < photoTop || relativeY > photoBottom) return;
    startDrag(event);
  }

  return (
    <main className="min-h-dvh bg-[#f6f1e7] pb-24 text-[#312d27] lg:pb-8">
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-8">
        <section aria-label="絵日記のプレビュー" className="order-1 min-w-0">
          <div className="mb-3 flex items-end justify-between">
            <div><p className="text-xs font-bold tracking-[0.18em] text-[#a55b46]">PREVIEW</p><h2 className="mt-1 text-lg font-bold">できあがりイメージ</h2></div>
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-[#81786c]">写真はドラッグで移動</span>
          </div>

          <div className="relative mx-auto aspect-[2/3] w-full max-w-[570px] overflow-hidden rounded-[4px] bg-[#fffefa] shadow-[0_18px_50px_rgba(78,61,40,.15)] ring-1 ring-black/5">
            <canvas
              ref={previewCanvas}
              aria-label="絵日記の完成プレビュー"
              className={`block size-full touch-none ${photoImage ? 'cursor-grab active:cursor-grabbing' : ''}`}
              onPointerDown={startPreviewDrag}
              onPointerMove={movePhoto}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
            {!photoUrl && <button type="button" onClick={() => fileInput.current?.click()} className="absolute left-[7.33%] right-[7.33%] top-[4.89%] grid h-[48.7%] place-items-center bg-[#f1ede5] text-[#91897e]"><span><ImagePlus className="mx-auto mb-2 size-8" strokeWidth={1.5} /><span className="text-sm font-bold">タップして写真を選ぶ</span></span></button>}
            {photoUrl && <span className="pointer-events-none absolute left-[9.5%] top-[47%] flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white"><Move className="size-3" />指で動かせます</span>}
          </div>
          <p className="mx-auto mt-3 max-w-[570px] text-center text-xs leading-5 text-[#81786c]">保存画像は高画質の縦長PNG（1200 × 1800px）です</p>
        </section>

        <aside className="order-2 h-fit rounded-3xl border border-[#dfd4c3] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgba(78,61,40,.08)] lg:sticky lg:top-24">
          <p className="text-xs font-bold tracking-[0.18em] text-[#a55b46]">EDIT</p>
          <h2 className="mb-5 mt-1 text-lg font-bold">絵日記をつくる</h2>
          <Button onClick={saveDiary} disabled={saving} className="mb-5 hidden h-12 w-full rounded-2xl bg-[#315c50] text-base text-white shadow-sm hover:bg-[#264b42] sm:flex"><Download className="size-5" />{saving ? '作成中…' : '写真に保存'}</Button>
          <div className="space-y-5">
            <label htmlFor="diary-date" className="block"><span className="mb-2 block text-sm font-bold">日付</span><Input id="diary-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 rounded-xl border-[#d8cdbc] bg-white" /></label>
            <fieldset><legend className="mb-2 text-sm font-bold">天気</legend><div className="grid grid-cols-3 gap-2">
              {weatherOptions.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => setWeather(id)} aria-pressed={weather === id} className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-bold transition ${weather === id ? 'border-[#315c50] bg-[#e8f0ed] text-[#315c50] shadow-sm' : 'border-[#ddd2c2] bg-white text-[#70685e]'}`}><Icon className="size-4" />{label}</button>)}
            </div></fieldset>
            <label htmlFor="diary-text" className="block"><span className="mb-2 flex items-center justify-between text-sm font-bold"><span>文章</span><span className="text-xs font-normal text-[#91897e]">{text.length}/150</span></span><Textarea id="diary-text" maxLength={150} value={text} onChange={(event) => setText(event.target.value)} className="min-h-28 resize-none rounded-xl border-[#d8cdbc] bg-white leading-7" placeholder="今日あったことを書いてみよう" /></label>
            <div>
              <input ref={fileInput} type="file" accept="image/*" className="sr-only" onChange={choosePhoto} />
              <button type="button" onClick={() => fileInput.current?.click()} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#cbbda8] bg-[#fbf7ef] text-sm font-bold text-[#665d51] transition hover:bg-[#f4ecdf]"><ImagePlus className="size-5" />{photoUrl ? '写真を変更する' : '写真を選ぶ'}</button>
            </div>

            {photoUrl && <Drawer showSwipeHandle>
              <DrawerTrigger className="flex h-14 w-full items-center justify-between rounded-2xl bg-[#315c50] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#264b42]">
                <span className="flex items-center gap-2"><Move className="size-5" />写真を見ながら調整</span><span className="rounded-full bg-white/15 px-2 py-1 text-[11px]">大きさ・位置</span>
              </DrawerTrigger>
              <DrawerContent className="[--drawer-height:94dvh] rounded-t-[28px] bg-[#fffdf8]">
                <DrawerHeader className="px-5 text-left">
                  <DrawerTitle className="text-xl font-bold">写真を見ながら調整</DrawerTitle>
                  <DrawerDescription className="text-[#81786c]">写真は指で動かせます。下のつまみでも細かく調整できます。</DrawerDescription>
                </DrawerHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
                  <div className="sticky top-0 z-10 -mx-4 bg-[#fffdf8] px-4 pb-4 pt-3">
                    <div className="mx-auto w-full max-w-[560px]" style={{ aspectRatio: `${INNER_WIDTH} / ${PHOTO_HEIGHT_PX}` }}>
                      {renderPhotoCropFrame(true)}
                    </div>
                  </div>
                  <div className="mx-auto max-w-[560px] space-y-5 rounded-3xl bg-[#f6f1e7] p-5">
                    <div><span className="mb-3 flex justify-between text-sm font-bold"><span>写真の大きさ</span><span>{Math.round(zoom * 100)}%</span></span><Slider aria-label="写真の大きさ" min={0.45} max={3} step={0.01} value={[zoom]} onValueChange={(value) => setZoom(typeof value === 'number' ? value : value[0])} /></div>
                    <div><span className="mb-3 flex justify-between text-sm font-bold"><span>左右の位置</span><span>{Math.round(positionX)}</span></span><Slider aria-label="写真の左右の位置" min={-100} max={100} step={1} value={[positionX]} onValueChange={(value) => setPositionX(typeof value === 'number' ? value : value[0])} /></div>
                    <div><span className="mb-3 flex justify-between text-sm font-bold"><span>上下の位置</span><span>{Math.round(positionY)}</span></span><Slider aria-label="写真の上下の位置" min={-100} max={100} step={1} value={[positionY]} onValueChange={(value) => setPositionY(typeof value === 'number' ? value : value[0])} /></div>
                    <p className="rounded-2xl bg-white/70 px-3 py-2 text-center text-xs leading-5 text-[#81786c]">100％より小さくすると、空いた部分は用紙の色になります。</p>
                    <button type="button" onClick={() => { setZoom(1); setPositionX(0); setPositionY(0); }} className="mx-auto flex items-center gap-1.5 text-sm font-bold text-[#846b5e]"><RotateCcw className="size-4" />調整をリセット</button>
                  </div>
                </div>
                <DrawerFooter className="border-t border-[#e5dac9] bg-[#fffdf8] px-4 py-3">
                  <DrawerClose className="h-12 rounded-2xl bg-[#e76f51] text-base font-bold text-white">この位置で決定</DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>}
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ded3c3] bg-[#fffdf8]/95 p-3 backdrop-blur sm:hidden"><Button onClick={saveDiary} disabled={saving} className="h-12 w-full rounded-2xl bg-[#315c50] text-base text-white shadow-lg hover:bg-[#264b42]"><Download className="size-5" />{saving ? '画像を作成中…' : '写真に保存'}</Button></div>
      {notice && <output aria-live="polite" className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#312d27] px-4 py-2 text-center text-sm font-bold text-white shadow-xl sm:bottom-6">{notice}</output>}
    </main>
  );
}
