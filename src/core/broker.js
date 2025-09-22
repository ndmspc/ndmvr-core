export class Broker {
  constructor (url, autoConnect, channel, timeout) {
    this.url = url;
    this.ws = null;
    this.channel = channel;
    if (autoConnect) this.connect();
    this.initTime = Date.now();               //start of timeout counter
    this.timeout = timeout ? timeout : 60000;  //timeout time (time to wait will no longer will try to connect)
    this.timeFlag = true;                     //flag if initTime has been newly set after failed connection
  }

  connect () {
    if (this.ws === null) {
      console.log("Trying to establish websocket connection on address: " + this.url);
      this.ws = new WebSocket(this.url);
    }

    this.ws.onerror = (event) => {
      if (!this.timeFlag) {
        this.initTime = Date.now();
        this.timeFlag = true;
      }
      setTimeout(() => {
        if (this.initTime + this.timeout < Date.now()) return;
        this.connect();
      }, 500);
    };

    this.ws.onclose = (event) => {
      this.disconnect();
      if (!this.timeFlag) {
        this.initTime = Date.now();
        this.timeFlag = true;
      }
      setTimeout(() => {
        if (this.initTime + this.timeout < Date.now()) return;
        this.connect();
      }, 500);
    };

    this.ws.onmessage = (event) => {
      this.channel.next(event.data);
    };

    this.ws.onopen = () => {
      console.log("Websocket connection established on address: " + this.url);
      this.timeFlag = false;
    };

    return this;
  }

  disconnect () {
    if (!this.ws) return;
    this.ws.close();
    this.ws = null;
  }

  send (data) {
    if (this.ws === null) this.connect();
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
