class Task {
  constructor(text) {
    this.id = this.getUniqeId();
    this.text = text;
    this.completed = false;
    this.priority = false;
  }

  getUniqeId() {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    let id = "";

    for (let i = 0; i < 5; i++) {
      id += letters[Math.floor(Math.random() * letters.length)];
    }
    for (let i = 0; i < 5; i++) {
      id += numbers[Math.floor(Math.random() * numbers.length)];
    }

    return id;
  }
}

const model = {
  list: [],
  search: [],
  timeouts: new Map(),
};

export { Task, model };
