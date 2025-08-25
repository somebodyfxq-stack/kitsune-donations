interface Client {
  id: number;
  controller: ReadableStreamDefaultController;
  timer?: ReturnType<typeof setInterval>;
  streamerId?: string | null;
  send?: (event: string, data: string) => void;
  lastActivity: number;
  userAgent?: string;
  isActive: boolean;
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
      const client: Client = { 
        id, 
        controller, 
        streamerId,
        lastActivity: Date.now(),
        isActive: true,
      };
      clients.push(client);
      console.log(`✅ Client ${id} connected (streamerId: ${streamerId}), total: ${clients.length}`);
      
      const encoder = new TextEncoder();
      function send(event: string, data: string) {
        try {
          if (!client.isActive) {
            throw new Error('Client is not active');
          }
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
          client.lastActivity = Date.now();
        } catch (err) {
          console.error(`❌ Failed to send ${event} to client ${id}:`, err);
          client.isActive = false;
          throw err;
        }
      }
      
      // Store send function on client for broadcasting
      client.send = send;
      
      // Відправляємо початковий connected event
      send("connected", JSON.stringify({
        clientId: id,
        serverTime: new Date().toISOString(),
        streamerId: streamerId || null,
      }));
      
      // Налаштовуємо оптимізовані ping'и (менше частоти)
      client.timer = setInterval(() => {
        try {
          if (!client.isActive) {
            throw new Error('Client inactive');
          }
          send("ping", String(Date.now()));
        } catch (err) {
          console.error(`❌ Ping failed for client ${id}:`, err);
          cleanupClient(id);
        }
      }, 45000); // Збільшено до 45 секунд щоб зменшити навантаження
    },
    cancel() {
      console.log(`🔌 Client ${id} disconnected gracefully`);
      cleanupClient(id);
    },
  });
  return { id, stream };
}

// =============================================
// OPTIMIZED CLIENT MANAGEMENT
// =============================================

function cleanupClient(clientId: number): void {
  const index = clients.findIndex((c) => c.id === clientId);
  if (index === -1) {
    console.log(`⚠️ Client ${clientId} not found for cleanup`);
    return;
  }
  
  const [client] = clients.splice(index, 1);
  client.isActive = false;
  
  if (client.timer) {
    clearInterval(client.timer);
  }
  
  console.log(`🧹 Client ${clientId} cleaned up, remaining: ${clients.length}`);
}

// Start background cleanup process
setInterval(() => {
  const now = Date.now();
  const staleClients: number[] = [];
  
  clients.forEach(client => {
    // Remove clients inactive for more than 2 minutes
    if (now - client.lastActivity > 120000 || !client.isActive) {
      staleClients.push(client.id);
    }
  });
  
  staleClients.forEach(clientId => {
    console.log(`🧹 Removing stale client: ${clientId}`);
    cleanupClient(clientId);
  });
  
  if (staleClients.length > 0) {
    console.log(`🧹 Cleanup completed: removed ${staleClients.length} stale clients`);
  }
}, 60000); // Cleanup every minute

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

// =============================================
// EXTENDED BROADCASTING FUNCTIONS
// =============================================

/**
 * Optimized broadcast function with better error handling
 */
export function broadcastToClients(streamerId: string | null, event: string, data: string): void {
  const targetClients = streamerId 
    ? clients.filter(client => client.streamerId === streamerId && client.isActive)
    : clients.filter(client => client.isActive);

  if (targetClients.length === 0) {
    console.log(`⚠️ No active clients found for streamerId: ${streamerId || 'all'}`);
    return;
  }

  console.log(`📡 Broadcasting ${event} to ${targetClients.length} active clients (streamerId: ${streamerId || 'all'})`);

  let successCount = 0;
  let failureCount = 0;
  const deadClients: number[] = [];

  targetClients.forEach(client => {
    try {
      if (client.send && client.isActive) {
        client.send(event, data);
        successCount++;
      } else {
        failureCount++;
        deadClients.push(client.id);
      }
    } catch (error) {
      console.error(`❌ Failed to send ${event} to client ${client.id}:`, error);
      failureCount++;
      deadClients.push(client.id);
    }
  });

  // Cleanup dead clients in batch
  deadClients.forEach(clientId => cleanupClient(clientId));

  if (successCount > 0) {
    console.log(`📊 Broadcast ${event}: ${successCount} success, ${failureCount} failures`);
  }
}

/**
 * Get all active clients
 */
export function getActiveClients(): Client[] {
  return [...clients];
}

/**
 * Get clients count by streamer
 */
export function getClientsStats(): { total: number; byStreamer: Record<string, number> } {
  const byStreamer: Record<string, number> = {};
  
  clients.forEach(client => {
    const streamerId = client.streamerId || 'anonymous';
    byStreamer[streamerId] = (byStreamer[streamerId] || 0) + 1;
  });

  return {
    total: clients.length,
    byStreamer,
  };
}
