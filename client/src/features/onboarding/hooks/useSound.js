import { useRef, useCallback } from "react";

const TEAR_URL = "/sounds/tear.mp3";
const PRINTER_URL = "/sounds/printer.mp3";

let sharedCtx = null;

function getCtx() {
  if (!sharedCtx) {
    sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return sharedCtx;
}

function loadBuffer(url) {
  return fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`Sound fetch failed: ${r.status}`);
      return r.arrayBuffer();
    })
    .then((buf) => getCtx().decodeAudioData(buf));
}

export default function useSound() {
  const tearBuf = useRef(null);
  const printerBuf = useRef(null);
  const loading = useRef({ tear: false, printer: false });

  const ensureBuffer = useCallback(async (key, url, ref) => {
    if (ref.current) return ref.current;
    if (loading.current[key]) return null;
    loading.current[key] = true;
    try {
      ref.current = await loadBuffer(url);
    } catch {
      ref.current = null;
    } finally {
      loading.current[key] = false;
    }
    return ref.current;
  }, []);

  const play = useCallback((buffer) => {
    if (!buffer) return;
    try {
      const ctx = getCtx();
      if (ctx.state === "suspended") ctx.resume();
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      /* silent */
    }
  }, []);

  const playTear = useCallback(() => {
    ensureBuffer("tear", TEAR_URL, tearBuf).then((buf) => play(buf));
  }, [ensureBuffer, play]);

  const playPrinter = useCallback(() => {
    ensureBuffer("printer", PRINTER_URL, printerBuf).then((buf) => play(buf));
  }, [ensureBuffer, play]);

  return { playTear, playPrinter };
}
