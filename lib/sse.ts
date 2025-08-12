interface Client {
  id: number;
  controller: ReadableStreamDefaultController;
  timer?: ReturnType<typeof setInterval>;
}

export interface DonationPayload {
  identifier: string;
  nickname: string;
  message: string;
  amount: number;
  createdAt: string;
  monoComment?: string;
}

interface SseGlobal {
  __sseClients?: Client[];
  __sseIdCounter?: number;
}

const sseGlobal = globalThis as typeof globalThis & SseGlobal;
sseGlobal.__sseClients ??= [];
sseGlobal.__sseIdCounter ??= 1;

const clients = sseGlobal.__sseClients;

export function addClient() {
  const id = sseGlobal.__sseIdCounter!;
  sseGlobal.__sseIdCounter! += 1;
  const stream = new ReadableStream({
    start(controller) {
      const client: Client = { id, controller };
      clients.push(client);
      const encoder = new TextEncoder();
      function send(event: string, data: string) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      }
      send("ping", "ok");
      client.timer = setInterval(() => {
        try {
          send("ping", String(Date.now()));
        } catch (err) {
          console.error("Failed to send ping", err);
        }
      }, 15000);
    },
    cancel() {
      const index = clients.findIndex((c) => c.id === id);
      if (index === -1) return;
      const [client] = clients.splice(index, 1);
      if (client.timer) clearInterval(client.timer);
    },
  });
  return { id, stream };
}

export function broadcastDonation(payload: DonationPayload) {
  const encoded = new TextEncoder().encode(
    `event: donation\ndata: ${JSON.stringify(payload)}\n\n`,
  );
  clients.forEach((c) => {
    try {
      c.controller.enqueue(encoded);
    } catch (err) {
      console.error("Failed to broadcast donation", err);
    }
  });
}
