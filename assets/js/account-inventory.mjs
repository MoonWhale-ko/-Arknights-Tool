import { INVENTORY_KEY } from "./account-state.mjs";
const box = document.getElementById("accountInventory");
async function display() {
  try {
    const stock = JSON.parse(localStorage.getItem(INVENTORY_KEY) || "null");
    if (stock?.version !== 1) return;
    const r = await fetch("data/items.json");
    if (!r.ok) return;
    const { items } = await r.json();
    box.replaceChildren();
    const heading = document.createElement("h2");
    heading.textContent = "가져온 보유 재료";
    box.append(heading);
    const note = document.createElement("p");
    note.className = "muted";
    note.textContent =
      "마지막 조회: " +
      new Date(stock.importedAt).toLocaleString("ko-KR") +
      " · 이 사이트의 육성 재료만 표시합니다.";
    box.append(note);
    const list = document.createElement("div");
    list.className = "items";
    for (const [id, item] of Object.entries(items)) {
      const count = stock.items[id] ?? 0;
      if (!count) continue;
      const entry = document.createElement("div");
      entry.className = "item";
      entry.textContent = `${item.name} ×${count.toLocaleString("ko-KR")}`;
      list.append(entry);
    }
    box.append(list);
    box.hidden = false;
  } catch {
    box.hidden = true;
  }
}
display();
window.addEventListener("storage", (e) => {
  if (e.key === INVENTORY_KEY) {
    box.hidden = true;
    display();
  }
});
