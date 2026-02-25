// src/components/BattleLog.js

export class BattleLog {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.logElement = this.#createLogWrapper();
    this.container.appendChild(this.logElement);
  }

  // Phương thức private để khởi tạo khung
  #createLogWrapper() {
    const wrapper = document.createElement('section');
    wrapper.className = 'battle-log-wrapper'; // Dùng CSS file riêng

    const title = document.createElement('h3');
    title.textContent = '📜 Dungeon Master Records';
    
    const list = document.createElement('div');
    list.id = 'dm-log-list';
    
    wrapper.append(title, list);
    return wrapper;
  }

  // Thêm entry mới một cách an toàn
  addEntry(message) {
    const list = document.getElementById('dm-log-list');
    const entry = document.createElement('article');
    entry.className = 'log-entry';

    const timestamp = document.createElement('time');
    timestamp.textContent = new Date().toLocaleTimeString();

    const text = document.createElement('p');
    // Tuyệt đối không innerHTML, dùng textContent để chống XSS
    text.textContent = message; 

    entry.append(timestamp, text);
    list.prepend(entry); // Newest on top
  }
}