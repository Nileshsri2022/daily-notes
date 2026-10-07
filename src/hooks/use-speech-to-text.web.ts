import { useCallback, useEffect, useRef, useState } from "react";

import type { SpeechToText } from "./speech-to-text.types";

/** Web implementation — the browser's built-in Web Speech API (Chrome/Edge). */

type AlternativeLike = { transcript: string };
type ResultLike = { isFinal: boolean; 0: AlternativeLike };
type ResultsLike = { length: number; [index: number]: ResultLike };
type RecognitionEventLike = { resultIndex: number; results: ResultsLike };
type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};
type RecognitionCtor = new () => RecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechToText(onSegment: (text: string) => void): SpeechToText {
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");

  const recognitionRef = useRef<RecognitionLike | null>(null);
  const onSegmentRef = useRef(onSegment);
  onSegmentRef.current = onSegment;
  const listeningRef = useRef(false);

  const halt = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    setPartial("");
  }, []);

  const ensureRecognition = useCallback((): RecognitionLike | null => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return null;
    if (recognitionRef.current) return recognitionRef.current;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          const trimmed = text.trim();
          if (trimmed) onSegmentRef.current(trimmed);
        } else {
          interim += text;
        }
      }
      setPartial(interim);
    };

    recognition.onerror = halt;

    recognition.onend = () => {
      if (listeningRef.current) {
        // Chrome ends the session on silence — restart to keep dictating.
        try {
          recognition.start();
          return;
        } catch {
          // fall through to halt
        }
      }
      halt();
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [halt]);

  const stop = useCallback(() => {
    halt();
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore — already stopped
    }
  }, [halt]);

  const start = useCallback(() => {
    const recognition = ensureRecognition();
    if (!recognition) return;
    listeningRef.current = true;
    setListening(true);
    setPartial("");
    try {
      recognition.start();
    } catch {
      // already running — keep state as listening
    }
  }, [ensureRecognition]);

  const toggle = useCallback(() => {
    if (listeningRef.current) stop();
    else start();
  }, [start, stop]);

  useEffect(
    () => () => {
      listeningRef.current = false;
      const recognition = recognitionRef.current;
      try {
        recognition?.abort ? recognition.abort() : recognition?.stop();
      } catch {
        // ignore
      }
    },
    []
  );

  return { supported, listening, partial, toggle, stop };
}
