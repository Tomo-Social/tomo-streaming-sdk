<div align="center">

# Tomo Streaming SDK

### Create interactive streams, join WebRTC sessions and send typed input—from any TypeScript platform.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Zero runtime dependencies](https://img.shields.io/badge/runtime_dependencies-0-22C55E)](package.json)
[![WebRTC](https://img.shields.io/badge/transport-WebRTC-333333?logo=webrtc&logoColor=white)](https://webrtc.org/)
[![License](https://img.shields.io/badge/license-PolyForm_Noncommercial-orange)](LICENSE.md)

[Install](#installation) · [Quick start](#quick-start) · [Input](#interactive-input) · [Control Plane](https://github.com/Tomo-Social/tomo-streaming-control-plane)

</div>

The official dependency-free TypeScript client for the standalone Tomo Streaming API. Use it from your backend to create and control sessions, then pass only the temporary connection object to your browser or native client.

> [!CAUTION]
> `TOMO_STREAM_API_KEY` is a server credential. Never bundle it into browser JavaScript. The browser only needs `session.connection` and the player access token it contains.

## Installation

During developer preview, install directly from GitHub:

```bash
npm install github:Tomo-Social/tomo-streaming-sdk
```

The package includes TypeScript declarations and builds automatically when installed from Git.

## Quick start

### 1. Create a session from your backend

```ts
import { TomoStreamingClient } from "@tomo/streaming-sdk";

const streaming = new TomoStreamingClient({
  baseUrl: "https://stream.example.com",
  apiKey: process.env.TOMO_STREAM_API_KEY!,
});

const session = await streaming.createSession({
  type: "desktop-stream-server",
  name: "Remote workspace",
  config: {
    display: ":0",
    width: 1280,
    height: 720,
    fps: 30,
    captureAudio: true,
  },
});

// Send both values—not your API key—to the authorized client.
return {
  streamingBaseUrl: "https://stream.example.com",
  connection: session.connection,
};
```

### 2. Join signaling from the client

```ts
const { streamingBaseUrl, connection } = await fetch("/api/my-stream-session").then((response) => response.json());
const signalingUrl = new URL(connection.signalingPath, streamingBaseUrl);
signalingUrl.protocol = signalingUrl.protocol === "https:" ? "wss:" : "ws:";

const socket = new WebSocket(signalingUrl);

socket.addEventListener("open", () => {
  socket.send(JSON.stringify({
    type: "join",
    room: connection.room,
    role: "player",
    accessToken: connection.accessToken,
    username: "viewer-1",
  }));
});
```

Your WebRTC integration then exchanges `offer`, `answer` and `candidate` messages through that socket. Media and input travel peer-to-peer or through TURN—not through the REST API.

## Client API

| Method | Result |
| --- | --- |
| `listSessions()` | Sessions owned by the current API key |
| `createSession(input)` | New camera, desktop or plugin session |
| `getSession(id)` | Current status, source and connected count |
| `action(id, action)` | Updated session after `pause`, `resume` or `restart` |
| `deleteSession(id)` | Stops and removes the runtime |
| `signalingUrl(session)` | Secure `ws:`/`wss:` endpoint derived from the API base URL |
| `joinMessage(session, username?)` | Player join envelope with temporary access token |

```ts
await streaming.action(session.id, "pause");
await streaming.action(session.id, "resume");
await streaming.action(session.id, "restart");
await streaming.deleteSession(session.id);
```

Errors are exposed as `TomoStreamingError` with stable `status` and `code` fields.

## Interactive input

`TomoStreamInput` generates versioned binary packets for the WebRTC `input` DataChannel:

```ts
import { TomoStreamInput } from "@tomo/streaming-sdk";

inputDataChannel.send(TomoStreamInput.keyboard(0x04, true));
inputDataChannel.send(TomoStreamInput.pointer(32_768, 32_768, 0));
inputDataChannel.send(TomoStreamInput.wheel(0, -120));
```

| Helper | Payload | Coordinate/key space |
| --- | --- | --- |
| `keyboard(hidUsage, pressed)` | Key up/down | USB HID usage code |
| `pointer(x, y, buttons)` | Absolute pointer + button mask | `0…65535` on each axis |
| `wheel(deltaX, deltaY)` | Signed scroll deltas | `-32768…32767` |

Every helper returns `ArrayBuffer`, which can be passed directly to `RTCDataChannel.send`. This avoids the `Uint8Array<ArrayBufferLike>` overload mismatch introduced by modern TypeScript DOM definitions.

The stream-server forwards input as an opaque protocol. The attached application or input agent decides how to apply it, keeping OS-level injection outside the media transport.

## Source types

Built-in types:

```ts
type StreamServerType =
  | "camera-stream-server"
  | "desktop-stream-server"
  | (string & {}); // third-party plugins
```

The open string extension deliberately allows new spawners without requiring an SDK release.

## Ecosystem

| Repository | Role |
| --- | --- |
| [tomo-streaming-control-plane](https://github.com/Tomo-Social/tomo-streaming-control-plane) | API, signaling and session orchestration |
| [tomo-stream-server](https://github.com/Tomo-Social/tomo-stream-server) | C++ media and input runtimes |
| [tomo-streaming-self-hosted](https://github.com/Tomo-Social/tomo-streaming-self-hosted) | Docker Compose deployment |

## Status and license

The SDK is in **developer preview** and follows the control plane v1 API. It is source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). Commercial use requires a separate license from Tomo.

---

<div align="center"><strong>One API for interactive camera, desktop, gaming and custom experiences.</strong></div>
