import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition | undefined;
  }
}

interface UseSpeechToTextOptions {
  value: string;
  onChange: (value: string) => void;
}

const SpeechRecognitionCtor: typeof SpeechRecognition | undefined =
  window.SpeechRecognition ?? window.webkitSpeechRecognition;

export function useSpeechToText({
  value,
  onChange,
}: UseSpeechToTextOptions) {
  const [localListening, setLocalListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  const preSpeechValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const supported = SpeechRecognitionCtor != null;

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    setLocalListening(false);

    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.abort();
    }
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognitionCtor) return;

    setError(null);
    preSpeechValueRef.current = value;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!shouldListenRef.current) return;

      let accumulated = preSpeechValueRef.current.trim();
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const segment = event.results[i][0].transcript;
        accumulated = accumulated ? `${accumulated} ${segment}` : segment;
      }
      onChangeRef.current(accumulated);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        return;
      }
      const message = `Speech recognition error: ${event.error}`;
      setError(message);
    };

    recognition.onend = () => {
      setLocalListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      shouldListenRef.current = true;
      setLocalListening(true);
    } catch (err) {
      shouldListenRef.current = false;
      const message =
        err instanceof Error ? err.message : "Speech recognition failed to start";
      setError(message);
      toast.error(message);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.abort();
      }
    };
  }, []);

  return {
    listening: localListening,
    supported,
    error,
    start,
    stop,
  };
}
