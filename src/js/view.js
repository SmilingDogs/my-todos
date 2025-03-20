import controller from "./controller.js";

class View {
  clearList() {
    document.getElementById("list").innerHTML = "";
  }

  createIcon(name) {
    const icon = document.createElement("ion-icon");
    icon.setAttribute("name", name);
    return icon;
  }

  render(what) {
    this.clearList();

    if (what.length != 0) {
      let list = document.getElementById("list");

      for (let i = 0; i < what.length; i++) {
        const item = document.createElement("li");
        const span = document.createElement("span");
        span.textContent = what[i].text;
        item.setAttribute("class", "item");
        span.setAttribute("class", "item-text");

        const check = this.createIcon("checkmark-outline");
        const trash = this.createIcon("trash-outline");
        const star = this.createIcon("star-outline");
        const edit = this.createIcon("create-outline");

        const link = document.createElement("a");
        link.href = `#/todos/${what[i].id}`;
        link.setAttribute("class", "item-link");
        link.append(span);
        item.append(link, check, trash, star, edit);
        list.append(item);

        if (what[i].completed) {
          //prettier-ignore
          span.setAttribute("style", "text-decoration: line-through; color: #bbb");
          check.setAttribute("style", "color: #bbb");
          trash.setAttribute("style", "color: #bbb");
          star.setAttribute("style", "color: #bbb");
          edit.setAttribute("style", "color: #bbb");
        }

        what[i].priority ? (star.name = "star") : (star.name = "star-outline");

        if (what[i].deadline) {
          const deadline = this.createIcon("alarm-outline");
          deadline.setAttribute("class", "deadline-icon");
          link.append(deadline);
        }

        check.addEventListener("click", () => controller.completeItem(what[i]));
        trash.addEventListener("click", () => controller.deleteItem(what[i]));
        //prettier-ignore
        star.addEventListener("click", () => controller.prioritizeItem(what[i]));
        edit.addEventListener("click", (e) => controller.editItem(what[i], e));
        const add = document.querySelector(".add-icon");
        const search = document.querySelector(".search-icon");

        add.addEventListener("click", () => {
          document.getElementById("add-item").focus();
        });
        search.addEventListener("click", () => {
          document.getElementById("search-item").focus();
        });
      }
    } else {
      this.renderEmpty("No tasks...");
    }
  }

  renderEmpty(text) {
    this.clearList();

    const item = document.createElement("li");
    const span = document.createElement("span");
    item.className = "item";
    span.className = "item-text";
    span.textContent = text;
    item.appendChild(span);
    list.appendChild(item);
  }
}

export default View;
