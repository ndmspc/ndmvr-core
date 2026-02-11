export class Broker {
  constructor (url, autoConnect, channel, timeout) {
    this.url = url;
    this.ws = null;
    this.channel = channel;
    this.connected = false;
    this.connecting = false;
    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectTimeout = null;
    this.initTime = Date.now();
    this.timeout = timeout || 60000;
    this.timeFlag = true;
    
    if (autoConnect) this.connect();
  }

  connect () {
    // Prevent duplicate connections
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.log("WebSocket already connecting/connected to: " + this.url);
      return this;
    }

    // Clear any pending reconnection
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.intentionalDisconnect = false;
    this.connecting = true;
    
    console.log("Trying to establish websocket connection on address: " + this.url);
    
    try {
      this.ws = new WebSocket(this.url);
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      this.connecting = false;
      this.emitConnectionEvent('error', { error });
      return this;
    }

    this.ws.onopen = () => {
      console.log("Websocket connection established on address: " + this.url);
      this.connected = true;
      this.connecting = false;
      this.reconnectAttempts = 0;
      this.timeFlag = false;
      
      // Emit connection established event
      this.emitConnectionEvent('connected', { url: this.url });
    };

    this.ws.onmessage = (event) => {
      // Emit regular data messages
      this.channel.next(event.data);
    };

    this.ws.onerror = (event) => {
      console.error("WebSocket error on " + this.url + ":", event);
      this.connecting = false;
      
      if (!this.timeFlag) {
        this.initTime = Date.now();
        this.timeFlag = true;
      }
      
      // Emit error event
      this.emitConnectionEvent('error', { url: this.url, event });
      
      // Schedule reconnection if not intentional and within limits
      if (!this.intentionalDisconnect && this.shouldReconnect()) {
        this.scheduleReconnect();
      }
    };

    this.ws.onclose = (event) => {
      console.log("WebSocket closed on " + this.url + ", code: " + event.code + ", reason: " + event.reason);
      const wasConnected = this.connected;
      this.connected = false;
      this.connecting = false;
      this.ws = null;
      
      if (!this.timeFlag) {
        this.initTime = Date.now();
        this.timeFlag = true;
      }
      
      // Emit close event
      this.emitConnectionEvent('closed', { url: this.url, code: event.code, reason: event.reason, wasConnected });
      
      // Schedule reconnection if not intentional and within limits
      if (!this.intentionalDisconnect && this.shouldReconnect()) {
        this.scheduleReconnect();
      }
    };

    return this;
  }

  shouldReconnect() {
    const timeoutExpired = this.initTime + this.timeout < Date.now();
    const attemptsExceeded = this.reconnectAttempts >= this.maxReconnectAttempts;
    return !timeoutExpired && !attemptsExceeded;
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) return; // Already scheduled
    
    this.reconnectAttempts++;
    const delay = Math.min(500 * this.reconnectAttempts, 5000); // Exponential backoff, max 5s
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms for ${this.url}`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (!this.intentionalDisconnect) {
        this.connect();
      }
    }, delay);
  }

  disconnect () {
    this.intentionalDisconnect = true;
    
    // Clear any pending reconnection
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      // Close with normal closure code
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }
    
    this.connected = false;
    this.connecting = false;
    this.reconnectAttempts = 0;
  }

  isConnected() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  isConnecting() {
    return this.connecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING);
  }

  getState() {
    if (!this.ws) return 'CLOSED';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  emitConnectionEvent(type, data) {
    // Emit special connection events through channel
    const event = {
      _brokerEvent: true,
      type,
      url: this.url,
      timestamp: Date.now(),
      ...data
    };
    this.channel.next(JSON.stringify(event));
  }

  send (data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send: WebSocket not open');
      return;
    }
    this.ws.send(data);
  }

  subscribe (callback) {
    const sub = this.channel.subscribe({
      next: (v) => callback(v),
    });
    return sub;
  }

  unsubscribe (sub) {
    sub.unsubscribe();
  }
}
