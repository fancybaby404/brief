// React Native exposes `global` at runtime; whisper.rn's TypeScript source (checked via the
// "react-native" export condition) refers to it for its JSI bindings.
declare var global: typeof globalThis & Record<string, any>;
