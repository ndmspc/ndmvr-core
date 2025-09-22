import { Broker } from '../core/broker'
import { ReplaySubject } from 'rxjs'

let brokerManager

class BrokerManager {
  #subject
  #gBrokers

  constructor () {
    this.#subject = new ReplaySubject(1)
    this.#gBrokers = new Map()
  }

  /**
   * Function that adds ws to its map,
   * takes searchParams, can obtain it by <new URL(window.location.href).searchParams>
   * if not defined otherwise, client automatically connects to that websocket,
   * otherwise connectWs(url) must be called.
   * */
  createWsFromParams = (searchParams) => {
    const autoConnect = searchParams.get('autoConnect') === 'true'
    const timeout = Number(searchParams.get('timeout'))
    searchParams.getAll('ws').forEach((url) => {
      this.createWs(url, autoConnect, timeout)
    })
  }

  createWs = (url, autoConnect, timeout) => {
    if (this.#gBrokers.has(url)) this.#gBrokers.delete(url)
    const b = new Broker(url, autoConnect, this.#subject, timeout)
    this.#gBrokers.set(url, b)
  }

  getBrokerByUrl = (url, autoConnect) => {
    let broker = this.#gBrokers.get(url)
    if (!broker) {
      broker = new Broker(url, autoConnect, this.#subject)
      this.#gBrokers.set(url, broker)
    }
    if (autoConnect) broker.connect()
    return broker
  }

  connectWsByUrl = (url) => {
    let broker = this.#gBrokers.get(url)
    if (!broker) {
      broker = new Broker(url, true, this.#subject)
      this.#gBrokers.set(url, broker)
    }
    broker.connect()
    return broker
  }

  /**
   * Function that disconnects ws,
   * @param url if is defined, disconnects from that ws, if it's not disconnectAll
   * */
  disconnectWsByUrl = (url) => {
    if (url) {
      this.#gBrokers.get(url).disconnect()
    } else {
      this.#gBrokers.forEach((b) => {
        b.disconnect()
      })
    }
  }

  getSubject = () => {
    return this.#subject
  }
}

export const brokerManagerGet = () => {
  if (!brokerManager) brokerManager = new BrokerManager()
  return brokerManager
}