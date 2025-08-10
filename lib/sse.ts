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

let clients: Client[] = [];
let idCounter = 1;

export function addClient() {
  const id = idCounter++;
  const stream = new ReadableStream({
    start(controller) {
      const c: Client = { id, controller };
      clients.push(c);
      const encoder = new TextEncoder();
      const send = (event: string, data: string) =>
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${data}\n\n`),
        );
      send("ping", "ok");
      c.timer = setInterval(() => {
        try {
          send("ping", String(Date.now()));
        } catch (err) {
          console.error("Failed to send ping", err);
        }
      }, 15000);
    },
    cancel() {
      const c = clients.find((x) => x.id === id);
      if (c?.timer) clearInterval(c.timer);
      clients = clients.filter((x) => x.id !== id);
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
