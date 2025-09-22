export default class RadixCounter {

  constructor (limits) {
    this.limits = limits;
    this.values = new Array(limits.length).fill(0);
    this.listeners = new Array(limits.length).fill(null);
  }

  onIncrement (index, callback) {
    if (index >= 0 && index < this.limits.length) {
      this.listeners[index] = callback;
    }
  }

  increment (index = 0) {
    if (index >= this.values.length) return false;

    this.values[index]++;

    if (this.listeners[index]) {
      this.listeners[index](this.values[index], index, [...this.values]);
    }

    if (this.values[index] >= this.limits[index]) {
      this.values[index] = 0;

      if (this.listeners[index]) {
        this.listeners[index](this.values[index], index, [...this.values]);
      }

      return this.increment(index + 1);
    }

    return true;
  }

  getIndex () {
    let index = 0;
    let multiplier = 1;

    for (let i = 0; i < this.values.length; i++) {
      index += this.values[i] * multiplier;
      multiplier *= this.limits[i];
    }

    return index;
  }

  setFromNumber (number) {
    const values = new Array(this.limits.length);
    for (let i = 0; i < this.limits.length; i++) {
      values[i] = Math.floor(number % this.limits[i]);
      number = Math.floor(number / this.limits[i]);
    }
    this.values = values;
  }

  getValueAt (index) {
    return this.values[index];
  }

  getValues () {
    return [...this.values];
  }

  reset () {
    this.values.fill(0);
  }
}