export type SpeechToText = {
  supported: boolean;
  listening: boolean;
  partial: string;
  toggle: () => void;
  stop: () => void;
};
