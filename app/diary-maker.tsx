'use client';

import { useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { CalendarDays, Cloud, Download, ImagePlus, Move, RotateCcw, Sparkles, Sun, Umbrella } from 'lucide-react';
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

const guideLines = Array.from({ length: 10 });

function todayInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatJapaneseDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
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
  const [photoHeight, setPhotoHeight] = useState(54);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  const formattedDate = formatJapaneseDate(date);

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

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!photoImage) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, startX: positionX, startY: positionY };
  }

  function movePhoto(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const nextX = drag.current.startX + (event.clientX - drag.current.x) * 0.7;
    const nextY = drag.current.startY + (event.clientY - drag.current.y) * 0.7;
    setPositionX(Math.max(-100, Math.min(100, nextX)));
    setPositionY(Math.max(-100, Math.min(100, nextY)));
  }

  function endDrag() {
    drag.current = null;
  }

  function drawVerticalText(ctx: CanvasRenderingContext2D, value: string, right: number, top: number, bottom: number) {
    const fontSize = 41;
    const stepY = 54;
    const stepX = 63;
    const maxRows = Math.max(1, Math.floor((bottom - top) / stepY));
    let column = 0;
    let row = 0;
    ctx.save();
    ctx.fillStyle = '#27231f';
    const diaryFont = getComputedStyle(document.documentElement).getPropertyValue('--font-diary').trim();
    ctx.font = `700 ${fontSize}px ${diaryFont || '"Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const char of Array.from(value)) {
      if (char === '\n' || row >= maxRows) {
        column += 1;
        row = 0;
        if (char === '\n') continue;
      }
      if (column >= 10) break;
      const x = right - column * stepX;
      if (x < 110) break;
      const y = top + row * stepY + fontSize / 2;
      ctx.fillText(char, x, y);
      row += 1;
    }
    ctx.restore();
  }

  function renderCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable');

    ctx.fillStyle = '#fffefa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const margin = 88;
    const innerX = margin;
    const innerY = margin;
    const innerW = canvas.width - margin * 2;
    const innerH = canvas.height - margin * 2;
    const photoH = Math.round((innerH * photoHeight) / 100);
    const metaW = 116;
    const writingTop = innerY + photoH;

    ctx.save();
    ctx.beginPath();
    ctx.rect(innerX, innerY, innerW, photoH);
    ctx.clip();
    if (photoImage) {
      const baseScale = Math.max(innerW / photoImage.naturalWidth, photoH / photoImage.naturalHeight);
      const scale = baseScale * zoom;
      const drawW = photoImage.naturalWidth * scale;
      const drawH = photoImage.naturalHeight * scale;
      const travelX = Math.max(0, (drawW - innerW) / 2);
      const travelY = Math.max(0, (drawH - photoH) / 2);
      const centerX = innerX + innerW / 2 + (positionX / 100) * travelX;
      const centerY = innerY + photoH / 2 + (positionY / 100) * travelY;
      ctx.drawImage(photoImage, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
    } else {
      ctx.fillStyle = '#f1ede5';
      ctx.fillRect(innerX, innerY, innerW, photoH);
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

    drawVerticalText(ctx, text, innerX + innerW - metaW - 36, writingTop + 68, innerY + innerH - 28);

    const metaCenter = innerX + innerW - metaW / 2;
    ctx.fillStyle = '#27231f';
    const diaryFont = getComputedStyle(document.documentElement).getPropertyValue('--font-diary').trim();
    ctx.font = `700 29px ${diaryFont || '"Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif'}`;
    ctx.textAlign = 'center';
    const dateChars = Array.from(formattedDate);
    dateChars.forEach((char, index) => ctx.fillText(char, metaCenter, writingTop + 72 + index * 36));
    const labelY = Math.min(innerY + innerH - 130, writingTop + 72 + dateChars.length * 36 + 28);
    ctx.font = `700 23px ${diaryFont || '"Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif'}`;
    ctx.fillText('天', metaCenter, labelY);
    ctx.fillText('気', metaCenter, labelY + 26);
    drawWeather(ctx, weather, metaCenter, innerY + innerH - 55, 56);
    return canvas;
  }

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

  const imageStyle = photoUrl
    ? {
        transform: `scale(${zoom}) translate(${(positionX / Math.max(zoom, 1)) * 0.35}%, ${(positionY / Math.max(zoom, 1)) * 0.35}%)`,
      }
    : undefined;

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
          <NextImage src={photoUrl} alt="選択した写真" draggable={false} fill unoptimized className="select-none object-cover will-change-transform" style={imageStyle} />
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

  return (
    <main className="min-h-dvh bg-[#f6f1e7] pb-24 text-[#312d27] lg:pb-8">
      <header className="sticky top-0 z-30 border-b border-[#ded3c3] bg-[#fffdf8]/92 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#e76f51] text-white shadow-sm"><Sparkles className="size-5" /></span>
            <div><h1 className="font-heading text-lg font-bold tracking-tight">まいにち絵日記</h1><p className="text-xs text-[#81786c]">写真から、今日の一枚を。</p></div>
          </div>
          <Button onClick={saveDiary} disabled={saving} className="hidden h-10 rounded-xl bg-[#315c50] px-4 text-white shadow-sm hover:bg-[#264b42] sm:flex"><Download className="size-4" />{saving ? '作成中…' : '写真に保存'}</Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-8">
        <section aria-label="絵日記のプレビュー" className="order-1 min-w-0">
          <div className="mb-3 flex items-end justify-between">
            <div><p className="text-xs font-bold tracking-[0.18em] text-[#a55b46]">PREVIEW</p><h2 className="mt-1 text-lg font-bold">できあがりイメージ</h2></div>
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-[#81786c]">写真はドラッグで移動</span>
          </div>

          <div className="mx-auto aspect-[3/4] w-full max-w-[570px] overflow-hidden rounded-[4px] bg-[#fffefa] p-[7%] shadow-[0_18px_50px_rgba(78,61,40,.15)] ring-1 ring-black/5">
            <div className="grid h-full border border-[#8f8a82]" style={{ gridTemplateRows: `${photoHeight}% ${100 - photoHeight}%` }}>
              {renderPhotoCropFrame()}
              <div className="grid min-h-0 grid-cols-[1fr_56px] border-t border-[#8f8a82]">
                <div className="relative grid grid-cols-10 overflow-hidden">
                  {guideLines.map((_, index) => <span key={index} className="border-r border-[#b7b2aa] last:border-r-0" />)}
                  <p className="absolute bottom-[4%] right-[2.2%] top-[11%] max-w-[96%] overflow-hidden font-bold [writing-mode:vertical-rl] text-[clamp(15px,3vw,24px)] leading-[1.8] tracking-[0.12em]">{text || 'ここに文章が入ります'}</p>
                </div>
                <div className="flex flex-col items-center overflow-hidden border-l border-[#8f8a82] pb-[8%] pt-[17%] text-[clamp(11px,2.2vw,16px)] font-bold">
                  <CalendarDays className="mb-2 size-4 shrink-0 text-[#716a61]" />
                  <div className="flex min-h-0 flex-1 flex-col items-center gap-2">
                    <span className="flex flex-col items-center leading-[1.32]">{Array.from(formattedDate).map((char, index) => <span key={`${char}-${index}`} className="block">{char}</span>)}</span>
                    <span className="flex flex-col text-[11px] leading-tight"><span>天</span><span>気</span></span>
                    {weatherOptions.map(({ id, Icon }) => id === weather ? <Icon key={id} className={`size-5 shrink-0 ${id === 'sunny' ? 'text-[#dc9a22]' : id === 'rainy' ? 'text-[#4a7198]' : 'text-[#7d8790]'}`} /> : null)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-3 max-w-[570px] text-center text-xs leading-5 text-[#81786c]">保存画像は高画質の縦長PNG（1200 × 1600px）です</p>
        </section>

        <aside className="order-2 h-fit rounded-3xl border border-[#dfd4c3] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgba(78,61,40,.08)] lg:sticky lg:top-24">
          <p className="text-xs font-bold tracking-[0.18em] text-[#a55b46]">EDIT</p>
          <h2 className="mb-5 mt-1 text-lg font-bold">絵日記をつくる</h2>
          <div className="space-y-5">
            <label htmlFor="diary-date" className="block"><span className="mb-2 block text-sm font-bold">日付</span><Input id="diary-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 rounded-xl border-[#d8cdbc] bg-white" /></label>
            <fieldset><legend className="mb-2 text-sm font-bold">天気</legend><div className="grid grid-cols-3 gap-2">
              {weatherOptions.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => setWeather(id)} aria-pressed={weather === id} className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-bold transition ${weather === id ? 'border-[#315c50] bg-[#e8f0ed] text-[#315c50] shadow-sm' : 'border-[#ddd2c2] bg-white text-[#70685e]'}`}><Icon className="size-4" />{label}</button>)}
            </div></fieldset>
            <label htmlFor="diary-text" className="block"><span className="mb-2 flex items-center justify-between text-sm font-bold"><span>文章</span><span className="text-xs font-normal text-[#91897e]">{text.length}/160</span></span><Textarea id="diary-text" maxLength={160} value={text} onChange={(event) => setText(event.target.value)} className="min-h-28 resize-none rounded-xl border-[#d8cdbc] bg-white leading-7" placeholder="今日あったことを書いてみよう" /></label>
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
                    <div className="mx-auto w-full max-w-[560px]" style={{ aspectRatio: `1024 / ${(1424 * photoHeight) / 100}` }}>
                      {renderPhotoCropFrame(true)}
                    </div>
                  </div>
                  <div className="mx-auto max-w-[560px] space-y-5 rounded-3xl bg-[#f6f1e7] p-5">
                    <div><span className="mb-3 flex justify-between text-sm font-bold"><span>写真の大きさ</span><span>{Math.round(zoom * 100)}%</span></span><Slider aria-label="写真の大きさ" min={1} max={3} step={0.01} value={[zoom]} onValueChange={(value) => setZoom(typeof value === 'number' ? value : value[0])} /></div>
                    <div><span className="mb-3 flex justify-between text-sm font-bold"><span>左右の位置</span><span>{Math.round(positionX)}</span></span><Slider aria-label="写真の左右の位置" min={-100} max={100} step={1} value={[positionX]} onValueChange={(value) => setPositionX(typeof value === 'number' ? value : value[0])} /></div>
                    <div><span className="mb-3 flex justify-between text-sm font-bold"><span>上下の位置</span><span>{Math.round(positionY)}</span></span><Slider aria-label="写真の上下の位置" min={-100} max={100} step={1} value={[positionY]} onValueChange={(value) => setPositionY(typeof value === 'number' ? value : value[0])} /></div>
                    <div><span className="mb-3 flex justify-between text-sm font-bold"><span>写真枠の高さ</span><span>{photoHeight}%</span></span><Slider aria-label="写真欄の高さ" min={42} max={68} step={1} value={[photoHeight]} onValueChange={(value) => setPhotoHeight(typeof value === 'number' ? value : value[0])} /></div>
                    <button type="button" onClick={() => { setZoom(1); setPositionX(0); setPositionY(0); setPhotoHeight(54); }} className="mx-auto flex items-center gap-1.5 text-sm font-bold text-[#846b5e]"><RotateCcw className="size-4" />調整をリセット</button>
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
