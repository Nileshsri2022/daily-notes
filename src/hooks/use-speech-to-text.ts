import { useCallback, useEffect, useRef, useState } from "react";
import { requireOptionalNativeModule } from "expo";

import type { SpeechToText } from "./speech-to-text.types";

/**
 * Native implementation — on-device speech recognition via the
 * expo-speech-recognition native module. Requires a development build
 * (it does not run inside Expo Go), so the module resolves to null there
 * and the mic button hides itself.
 */

type RecognitionResultEvent = {
  isFinal: boolean;
  results: { transcript: string; confidence: number }[];
};

type SpeechModuleType = {
  addListener: <T>(
    eventName: string,
    listener: (event: T) => void
  ) => { remove: () => void };
  start: (options: {
    lang?: string;
    interimResults?: boolean;
    continuous?: boolean;
  }) => void;
  stop: () => void;
  abort: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
};

const speechModule = requireOptionalNativeModule(
  "ExpoSpeechRecognition"
) as SpeechModuleType | null;

export function useSpeechToText(onSegment: (text: string) => void): SpeechToText {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");

  const onSegmentRef = useRef(onSegment);
  onSegmentRef.current = onSegment;
  const listeningRef = useRef(false);

  const halt = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    setPartial("");
  }, []);

  useEffect(() => {
    if (!speechModule) return;

    const subscriptions = [
      speechModule.addListener("start", () => {
        listeningRef.current = true;
        setListening(true);
      }),
      speechModule.addListener("end", halt),
      speechModule.addListener("error", halt),
      speechModule.addListener(
        "result",
        (event: RecognitionResultEvent) => {
          const last = event.results[event.results.length - 1];
          const transcript = last?.transcript.trim() ?? "";
          if (event.isFinal) {
            if (transcript) onSegmentRef.current(transcript);
            setPartial("");
          } else {
            setPartial(transcript);
          }
        }
      ),
    ];
    return () => {
      subscriptions.forEach((sub) => sub.remove());
      speechModule.stop();
    };
  }, [halt]);

  const stop = useCallback(() => {
    halt();
    try {
      speechModule?.stop();
    } catch {
      // ignore — already stopped
    }
  }, [halt]);

  const start = useCallback(async () => {
    if (!speechModule) return;
    const permissions = await speechModule.requestPermissionsAsync();
    if (!permissions.granted) return;
    listeningRef.current = true;
    setListening(true);
    setPartial("");
    speechModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: true,
    });
  }, []);

  const toggle = useCallback(() => {
    if (listeningRef.current) stop();
    else void start();
  }, [start, stop]);

  return { supported: speechModule !== null, listening, partial, toggle, stop };
}
