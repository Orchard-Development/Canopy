import { useState, useCallback, useRef, useEffect } from "react";
import { usePersistedState } from "./usePersistedState";

export type AudioSource = "mic" | "desktop" | "both";

export interface AudioDevice {
  deviceId: string;
  label: string;
}

interface AudioCaptureResult {
  capturing: boolean;
  source: AudioSource;
  setSource: (s: AudioSource) => void;
  micDeviceId: string;
  setMicDeviceId: (id: string) => void;
  availableMics: AudioDevice[];
  refreshMics: () => Promise<void>;
  autoSend: boolean;
  setAutoSend: (v: boolean) => void;
  chunkDuration: number;
  setChunkDuration: (ms: number) => void;
  start: () => Promise<void>;
  stop: () => void;
  supported: boolean;
}

async function transcribe(blob: Blob): Promise<string> {
  const res = await fetch("/api/ai/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: blob,
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data.text ?? "";
}

async function getMicStream(deviceId?: string): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: deviceId ? { deviceId: { exact: deviceId } } : true,
  };
  return navigator.mediaDevices.getUserMedia(constraints);
}

async function getDesktopStream(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: { width: 1, height: 1 },
  });
  stream.getVideoTracks().forEach((t) => t.stop());
  return stream;
}

function mergeAudioStreams(
  a: MediaStream,
  b: MediaStream,
): { merged: MediaStream; ctx: AudioContext } {
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  ctx.createMediaStreamSource(a).connect(dest);
  ctx.createMediaStreamSource(b).connect(dest);
  return { merged: dest.stream, ctx };
}

export function useAudioCapture(
  onTranscript: (text: string) => void,
): AudioCaptureResult {
  const [capturing, setCapturing] = useState(false);
  const [source, setSource] = usePersistedState<AudioSource>("audio.source", "mic");
  const [micDeviceId, setMicDeviceId] = usePersistedState<string>("audio.mic_device", "");
  const [availableMics, setAvailableMics] = useState<AudioDevice[]>([]);
  const [autoSend, setAutoSend] = usePersistedState<boolean>("audio.auto_send", false);
  const [chunkDuration, setChunkDuration] = usePersistedState<number>(
    "audio.chunk_duration",
    5000,
  );

  const refreshMics = useCallback(async () => {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach((t) => t.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 6)}`,
        }));
      setAvailableMics(mics);
    } catch {
      setAvailableMics([]);
    }
  }, []);

  useEffect(() => {
    refreshMics();
  }, [refreshMics]);

  const activeRef = useRef(false);
  const streamsRef = useRef<MediaStream[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const supported = typeof navigator.mediaDevices?.getUserMedia === "function";

  const cleanup = useCallback(() => {
    activeRef.current = false;
    recorderRef.current?.stop();
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    recorderRef.current = null;
    setCapturing(false);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const stop = useCallback(() => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    if (!supported || capturing) return;

    try {
      let recordStream: MediaStream;
      const selectedMic = micDeviceId || undefined;

      if (source === "mic") {
        recordStream = await getMicStream(selectedMic);
        streamsRef.current = [recordStream];
      } else if (source === "desktop") {
        recordStream = await getDesktopStream();
        streamsRef.current = [recordStream];
      } else {
        const mic = await getMicStream(selectedMic);
        const desktop = await getDesktopStream();
        const { merged, ctx } = mergeAudioStreams(mic, desktop);
        recordStream = merged;
        streamsRef.current = [mic, desktop, merged];
        audioCtxRef.current = ctx;
      }

      activeRef.current = true;
      setCapturing(true);

      const recordChunk = (): void => {
        if (!activeRef.current) return;

        const chunks: Blob[] = [];
        const recorder = new MediaRecorder(recordStream, { mimeType: "audio/webm" });
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: "audio/webm" });
            const text = await transcribe(blob);
            if (text.trim()) onTranscript(text.trim());
          }
          if (activeRef.current) recordChunk();
        };

        recorder.start();
        setTimeout(() => {
          if (recorder.state === "recording") recorder.stop();
        }, chunkDuration);
      };

      recordChunk();
    } catch {
      cleanup();
    }
  }, [supported, capturing, source, micDeviceId, chunkDuration, onTranscript, cleanup]);

  return {
    capturing,
    source,
    setSource,
    micDeviceId,
    setMicDeviceId,
    availableMics,
    refreshMics,
    autoSend,
    setAutoSend,
    chunkDuration,
    setChunkDuration,
    start,
    stop,
    supported,
  };
}
