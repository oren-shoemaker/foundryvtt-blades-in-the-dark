export class Mutex {
  mutex = Promise.resolve();

  lock() {
    return new Promise((resolve) => {
      this.mutex = this.mutex.then(() => new Promise(resolve));
    });
  }
}