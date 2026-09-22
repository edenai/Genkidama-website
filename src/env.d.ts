/// <reference types="astro/client" />
/// <reference types="vite/client" />

declare module '*.glsl' {
  const src: string;
  export default src;
}
declare module '*.glsl?raw' {
  const src: string;
  export default src;
}
