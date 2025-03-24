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
        item.setAttribute("data-id", what[i].id);
        span.setAttribute("class", "item-text");

        const check = this.createIcon("checkmark-outline");
        const trash = this.createIcon("trash-outline");
        const star = this.createIcon("star-outline");
        const edit = this.createIcon("create-outline");

        const link = document.createElement("a");
        link.href = `#/todo/${what[i].id}`;
        link.setAttribute("class", "item-link");
        link.append(span);
        item.append(link, check, trash, star, edit);
        list.append(item);

        if (what[i].completed) {
          span.setAttribute(
            "style",
            "text-decoration: line-through; color: #bbb"
          );
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

        // Use the appropriate event based on device type
        const eventType = controller.isMobile ? "touchend" : "click";

        check.addEventListener(eventType, (e) => {
          e.preventDefault();
          e.stopPropagation(); // Stop event bubbling
          // Force immediate visual feedback
          const isCompleted = what[i].completed;
          span.style.textDecoration = isCompleted ? "none" : "line-through";
          span.style.color = isCompleted ? "inherit" : "#bbb";
          check.style.color = isCompleted ? "inherit" : "#bbb";
          // Process after visual update
          setTimeout(() => controller.completeItem(what[i]), 10);
        });

        trash.addEventListener(eventType, (e) => {
          e.preventDefault();
          e.stopPropagation();
          controller.deleteItem(what[i]);
        });

        star.addEventListener(eventType, (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Force immediate icon update
          star.setAttribute(
            "name",
            star.getAttribute("name") === "star-outline"
              ? "star"
              : "star-outline"
          );
          setTimeout(() => controller.prioritizeItem(what[i]), 10);
        });

        edit.addEventListener(eventType, (e) => {
          e.preventDefault();
          e.stopPropagation();
          controller.editItem(what[i], e);
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
