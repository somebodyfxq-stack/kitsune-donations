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
  youtubeUrl?: string | null; // YouTube URL для віджету
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
  
  console.log(`🔌 Adding SSE client ${id}, streamerId: ${streamerId}, total clients: ${clients.length + 1}`);
  
  const stream = new ReadableStream({
    start(controller) {
      const client: Client = { id, controller, streamerId };
      clients.push(client);
      console.log(`✅ Client ${id} connected successfully`);
      
      const encoder = new TextEncoder();
      function send(event: string, data: string) {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        } catch (err) {
          console.error(`❌ Failed to send ${event} to client ${id}:`, err);
          throw err;
        }
      }
      
      // Відправляємо початковий ping
      send("ping", "ok");
      console.log(`📡 Initial ping sent to client ${id}`);
      
      // Налаштовуємо регулярні ping'и
      client.timer = setInterval(() => {
        try {
          send("ping", String(Date.now()));
        } catch (err) {
          console.error(`❌ Failed to send ping to client ${id}:`, err);
          // Видаляємо клієнта якщо ping не вдався
          const index = clients.findIndex((c) => c.id === id);
          if (index !== -1) {
            const [deadClient] = clients.splice(index, 1);
            if (deadClient.timer) clearInterval(deadClient.timer);
            console.log(`🗑️ Removed dead client ${id}`);
          }
        }
      }, 15000);
    },
    cancel() {
      console.log(`🔌 Client ${id} disconnected`);
      const index = clients.findIndex((c) => c.id === id);
      if (index === -1) {
        console.log(`⚠️ Client ${id} not found for removal`);
        return;
      }
      const [client] = clients.splice(index, 1);
      if (client.timer) clearInterval(client.timer);
      console.log(`✅ Client ${id} removed, remaining clients: ${clients.length}`);
    },
  });
  return { id, stream };
}

export function broadcastDonation(payload: DonationPayload, eventType?: string) {
  console.log(`Broadcasting donation to ${clients.length} clients:`, payload);
  
  // Визначаємо тип події на основі наявності YouTube URL або переданого параметра
  const finalEventType = eventType || (payload.youtubeUrl ? 'youtube-video' : 'donation');
  
  const encoded = new TextEncoder().encode(
    `event: ${finalEventType}\ndata: ${JSON.stringify(payload)}\n\n`,
  );
  
  let sentCount = 0;
  clients.forEach((c, index) => {
    try {
      // Фільтруємо клієнтів: якщо streamerId не вказан - показуємо всі донати,
      // якщо вказан - показуємо тільки для цього стрімера
      const shouldSend = c.streamerId === null || c.streamerId === payload.streamerId;
      console.log(`Client ${index}: streamerId=${c.streamerId}, shouldSend=${shouldSend}, eventType=${finalEventType}`);
      
      if (shouldSend) {
        c.controller.enqueue(encoded);
        sentCount++;
      }
    } catch (err) {
      console.error("Failed to broadcast donation", err);
    }
  });
  
  console.log(`Sent ${finalEventType} event to ${sentCount}/${clients.length} clients`);
}
