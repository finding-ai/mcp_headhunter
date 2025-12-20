import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

/**
 * StreamableHttpServerTransport - Alternative moderne au SSE
 * Basé sur la spec MCP pour le transport HTTP streamable
 */
export class StreamableHttpServerTransport extends Transport {
  constructor(endpoint, response) {
    super();
    this.endpoint = endpoint;
    this.response = response;
    this.sessionId = this.generateSessionId();
    
    // Configuration des headers pour streaming
    this.response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async start() {
    // Envoie un message initial de connexion
    this.sendEvent('connected', { sessionId: this.sessionId });
  }

  async send(message) {
    // Envoie un message au format SSE
    const data = JSON.stringify(message);
    this.response.write(`data: ${data}\n\n`);
  }

  async close() {
    this.response.end();
  }

  sendEvent(event, data) {
    this.response.write(`event: ${event}\n`);
    this.response.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Gestion des messages POST reçus
  async handlePostMessage(req, res) {
    const message = req.body;
    
    // Émettre le message reçu vers le serveur MCP
    this.onmessage?.(message);
    
    // Répondre au client
    res.status(200).json({ received: true });
  }
}