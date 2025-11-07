export default class RadixCounter {

  constructor(limits) {
    this.limits = new Int32Array(limits);
    this.values = new Int32Array(limits.length);
  }

  increment() {
    for (let i = 0; i < this.values.length; i++) {
      this.values[i]++;
      if (this.values[i] < this.limits[i]) return true;
      this.values[i] = 0;
    }
    return false;
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

  setFromNumber(number) {
    for (let i = 0; i < this.limits.length; i++) {
      this.values[i] = Math.floor(number % this.limits[i]);
      number = Math.floor(number / this.limits[i]);
    }
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