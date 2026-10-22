// Records a voice note and stops by itself when you stop talking.
/** done → Blob with audio; an empty Blob if nothing was heard; null if the mic is blocked. */
export type Recording = { stop: () => void; done: Promise<Blob | null> };

export function canRecord() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

export function record(opts: { onLevel?: (v: number) => void; maxMs?: number; silenceMs?: number } = {}): Recording {
  let wanted = false;
  let stopFn = () => { wanted = true; };
  const done = new Promise<Blob | null>(async (resolve) => {
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch { resolve(null); return; }
    if (wanted) { stream.getTracks().forEach((t) => t.stop()); resolve(new Blob([])); return; }
    const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
    const parts: Blob[] = [];
    let ctx: AudioContext | null = null, raf = 0, spoke = false, quietSince = Date.now();
    const started = Date.now();
    try {
      ctx = new AudioContext();
      const an = ctx.createAnalyser(); an.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0; for (const b of buf) { const x = (b - 128) / 128; sum += x * x; }
        const level = Math.min(1, Math.sqrt(sum / buf.length) * 6);
        opts.onLevel?.(level);
        const now = Date.now();
        if (level > 0.08) { spoke = true; quietSince = now; }
        if ((spoke && now - quietSince > (opts.silenceMs ?? 1800)) || (!spoke && now - started > 9000) || now - started > (opts.maxMs ?? 60000)) { stopFn(); return; }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } catch { /* level meter is optional */ }
    mr.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
    mr.onstop = () => {
      cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); ctx?.close().catch(() => {});
      const blob = new Blob(parts, { type: mr.mimeType || "audio/webm" });
      // Nothing loud enough to be speech → don't send it (AI can invent words for silence).
      resolve(blob.size > 400 && spoke ? blob : new Blob([], { type: blob.type }));
    };
    stopFn = () => { if (mr.state === "recording") mr.stop(); };
    mr.start(250);
  });
  return { stop: () => stopFn(), done };
}

export async function blobToBase64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

/**
 * Turns a phone recording (often WebM/Opus, which Google's AI may refuse) into a small
 * 16 kHz mono WAV, a format every speech service accepts. Falls back to the original.
 */
export async function toWav(b: Blob, maxSeconds = 60): Promise<Blob> {
  try {
    const AC = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new AC();
    const audio = await ctx.decodeAudioData(await b.arrayBuffer());
    void ctx.close().catch(() => {});
    const rate = 16000, len = Math.min(Math.ceil(audio.duration * rate), maxSeconds * rate);
    const off = new OfflineAudioContext(1, Math.max(1, len), rate);
    const src = off.createBufferSource(); src.buffer = audio; src.connect(off.destination); src.start();
    const pcm = (await off.startRendering()).getChannelData(0);
    const buf = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(buf);
    const str = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    str(0, "RIFF"); v.setUint32(4, 36 + pcm.length * 2, true); str(8, "WAVE"); str(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
    v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) { const x = Math.max(-1, Math.min(1, pcm[i])); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
    return new Blob([buf], { type: "audio/wav" });
  } catch { return b; }
}
