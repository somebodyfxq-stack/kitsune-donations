interface Client {
  id: number;
  controller: ReadableStreamDefaultController;
  timer?: ReturnType<typeof setInterval>;
  streamerId?: string | null; // Фільтр по конкретному стрімеру, null = всі донати
}

export interface DonationPayload {
  identifier: string;
  nickname: string;
  message: string;
  amount: number;
  createdAt: string;
  monoComment?: string;
  jarTitle?: string; // Назва банки на момент донату
  streamerId: string; // ID стрімера для якого донат
}

interface SseGlobal {
  __sseClients?: Client[];
  __sseIdCounter?: number;
}

const sseGlobal = globalThis as typeof globalThis & SseGlobal;
sseGlobal.__sseClients ??= [];
sseGlobal.__sseIdCounter ??= 1;

const clients = sseGlobal.__sseClients;

export function addClient(streamerId?: string | null) {
  const id = sseGlobal.__sseIdCounter!;
  sseGlobal.__sseIdCounter! += 1;
  const stream = new ReadableStream({
    start(controller) {
      const client: Client = { id, controller, streamerId };
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
  console.log(`Broadcasting donation to ${clients.length} clients:`, payload);
  
  const encoded = new TextEncoder().encode(
    `event: donation\ndata: ${JSON.stringify(payload)}\n\n`,
  );
  
  let sentCount = 0;
  clients.forEach((c, index) => {
    try {
      // Фільтруємо клієнтів: якщо streamerId не вказан - показуємо всі донати,
      // якщо вказан - показуємо тільки для цього стрімера
      const shouldSend = c.streamerId === null || c.streamerId === payload.streamerId;
      console.log(`Client ${index}: streamerId=${c.streamerId}, shouldSend=${shouldSend}`);
      
      if (shouldSend) {
        c.controller.enqueue(encoded);
        sentCount++;
      }
    } catch (err) {
      console.error("Failed to broadcast donation", err);
    }
  });
  
  console.log(`Sent donation to ${sentCount}/${clients.length} clients`);
}
