import {ReplaySubject} from "rxjs";

export class Broker {
   constructor(url, autoConnect, channel) {
      this.url = url;
      this.ws = autoConnect ? new WebSocket(url) : null;
      this.channel = channel;
      if (autoConnect) this.connect();
   }

   connect() {
      if (this.ws === null) this.ws = new WebSocket(this.url);
      this.ws.onmessage = (event) => {
         this.channel.next(event.data);
      };
      return this;
   }

   disconnect() {
      this.ws.close();
      this.ws = null;
   }

   send(data) {
      if (this.ws === null) this.connect();
      this.ws.send(data);
   }
   subscribe(callback) {
      const sub = this.channel.subscribe({
         next: (v) => callback(v),
      });
      return sub;
   }
   unsubscribe(sub) {
      sub.unsubscribe();
   }
}
