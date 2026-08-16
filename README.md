# Tomo Streaming SDK

SDK independiente de la red social Tomo. Se usa desde el backend de una plataforma para crear streams y entrega al navegador únicamente `session.connection`.

```ts
import { TomoStreamingClient, TomoStreamInput } from "@tomo/streaming-sdk";

const streaming = new TomoStreamingClient({ baseUrl: "https://stream.example.com", apiKey: process.env.TOMO_STREAM_API_KEY! });
const session = await streaming.createSession({
  type: "desktop-stream-server",
  config: { display: ":0", width: 1280, height: 720, fps: 30 },
});

const socket = new WebSocket(streaming.signalingUrl(session));
socket.addEventListener("open", () => socket.send(JSON.stringify(streaming.joinMessage(session))));
inputDataChannel.send(TomoStreamInput.keyboard(0x04, true));
```

No expongas la API key en el navegador. Los helpers de input retornan `ArrayBuffer` para ser compatibles con `RTCDataChannel.send` y con las definiciones DOM modernas de TypeScript.
