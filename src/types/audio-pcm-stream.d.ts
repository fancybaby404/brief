// @fugood/react-native-audio-pcm-stream ships typings under its upstream name; this maps them to the installed package.
declare module '@fugood/react-native-audio-pcm-stream' {
  export type Options = { sampleRate: number; channels: 1 | 2; bitsPerSample: 8 | 16; audioSource?: number; bufferSize?: number; wavFile?: string };
  const AudioRecord: {
    /** Android returns a promise; iOS returns nothing. Always await it. */
    init(options: Options): Promise<void> | void;
    start(): void;
    stop(): Promise<string> | void;
    on(event: 'data', callback: (base64Pcm: string) => void): { remove(): void };
  };
  export default AudioRecord;
}
