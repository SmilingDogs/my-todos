import { Task, model } from "./model.js";
import View from "./view.js";
import Router from "./router.js";
import Bowser from "bowser";
import flatpickr from "flatpickr";

//prettier-ignore
let day = new Date().getDate() < 10 ? "0" + new Date().getDate() : new Date().getDate();
let month = new Date().toString().split(" ")[1];
let year = new Date().getFullYear().toString();

const title = document.querySelector("h1");
title.textContent = `${day} ${month} ${year}`;

function checkNotificationSupport() {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notifications.");
    return false;
  }

  if (Notification.permission === "granted") {
    console.log("Notification permission granted.");
    new Notification("Test Notification", {
      body: "This is a test notification.",
    });
    return true;
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        console.log("Notification permission granted after request.");
        new Notification("Test Notification", {
          body: "This is a test notification.",
        });
        return true;
      } else {
        console.log("Notification permission denied.");
        return false;
      }
    });
  } else {
    console.log("Notification permission denied.");
    return false;
  }
}

class Controller {
  constructor(view) {
    this.view = view;
    new Router(this);
    // this.handleDeadlineChange = null;
    this.handleDetailsKeydown = null;
    // Check notification support and request permission if needed
    this.notificationSupported = checkNotificationSupport();
  }

  init() {
    this.view.render(model.list);
  }

  showTodoList() {
    document.getElementById("todo").style.display = "block";
    document.getElementById("task-details").style.display = "none";
    this.view.render(model.list);
    console.log(model.list);
  }

  showTaskDetails(taskId) {
    document.getElementById("todo").style.display = "none";
    document.getElementById("task-details").style.display = "flex";
    // console.log(this.browserDetection());

    const task = model.list.find((t) => t.id === taskId);
    if (task) {
      document.getElementById("task-title").textContent = task.text;

      // if (this.browserDetection() === "Chrome") {
      //   this.showCustomDeadlineInput();
      //prettier-ignore
      // const flatpickrElement = document.getElementById("datetime-custom");

      flatpickr("#datetime-custom", {
        enableTime: true,
        dateFormat: "d-m-Y H:i",
        time_24hr: true,
        minDate: "today",
        locale: {
          firstDayOfWeek: 1,
        },
        // Initialize custom properties to track changes
        onReady: (selectedDates, dateStr, instance) => {
          instance._hasDateChanged = false;
          instance._hasHoursChanged = false;
          instance._hasMinutesChanged = false;
        },
        onChange: (selectedDates, dateStr, instance) => {
          instance._hasDateChanged = true;
        },
        onValueUpdate: (selectedDates, dateStr, instance) => {
          if (!dateStr) {
            this.updateDeadline(taskId);
          }
          const timeParts = dateStr.split(" ")[1]?.split(":");
          if (timeParts) {
            instance._hasHoursChanged = true;
            instance._hasMinutesChanged = true;
          }
        },
        onClose: (selectedDates, dateStr, instance) => {
          if (
            instance._hasDateChanged &&
            instance._hasHoursChanged &&
            instance._hasMinutesChanged
          ) {
            this.updateDeadline(taskId);
            instance._hasDateChanged = false;
            instance._hasHoursChanged = false;
            instance._hasMinutesChanged = false;
          } else if (!dateStr) {
            this.updateDeadline(taskId);
          }
        },
      });

      const deadlineInput = document.getElementById("datetime-custom");

      let storedDate = "";
      let storedTime = "";

      if (task.deadline) {
        const [date, time] = task.deadline.split("T");
        storedDate = date || "";
        storedTime = time ? time.slice(0, 5) : ""; // Extract only the time part (HH:mm)
      }

      deadlineInput.value = `${storedDate} ${storedTime}`.trim();
      // const today = new Date().toISOString().slice(0, 16);
      // deadlineInput.setAttribute("min", today);

      // Remove any existing event listeners before adding a new one
      // if (this.handleDeadlineChange) {
      //   deadlineInput.removeEventListener("change", this.handleDeadlineChange);
      // }
      // this.handleDeadlineChange = () => this.updateDeadline(taskId);
      // deadlineInput.addEventListener("change", this.handleDeadlineChange);

      const detailsTextarea = document.getElementById("task-details-text");
      detailsTextarea.value = task.details || "";

      // Remove any existing event listeners before adding a new one
      if (this.handleDetailsKeydown) {
        detailsTextarea.removeEventListener(
          "keydown",
          this.handleDetailsKeydown
        );
      }
      this.handleDetailsKeydown = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          this.updateTaskDetails(taskId, detailsTextarea.value);
        }
      };
      detailsTextarea.addEventListener("keydown", this.handleDetailsKeydown);
    }
  }

  showCustomDeadlineInput() {
    document.getElementById("task-deadline").style.display = "none";
    // document.getElementById("datetime-custom").style.display =
    //   "inline-block";
    document
      .getElementById("label-for-deadline")
      .setAttribute("for", "datetime-custom");
    document.querySelector(".calendar-icon").style.display = "block";
  }

  updateDeadline(taskId) {
    const task = model.list.find((t) => t.id === taskId);
    if (task) {
      let deadlineValue = document.getElementById("datetime-custom").value;

      if (!deadlineValue) {
        delete task.deadline;
        this.removeNotification(taskId);
      } else {
        task.deadline = `${deadlineValue}`;
        this.scheduleNotification(taskId, task.deadline);
      }

      localStorage.setItem("todos", JSON.stringify(model.list));
    }
  }

  updateTaskDetails(taskId, details) {
    const task = model.list.find((t) => t.id === taskId);
    if (task) {
      task.details = details;
      localStorage.setItem("todos", JSON.stringify(model.list));
    }
  }

  scheduleNotification(taskId, deadline) {
    const task = model.list.find((t) => t.id === taskId);
    if (!task || !deadline) return;
    // Clear any existing timeout for this task
    this.removeNotification(taskId);

    let deadlineTime = 0;

    if (deadline.includes("T")) {
      deadlineTime = new Date(deadline).getTime();
    } else {
      const [date, time] = deadline.split(" ");
      const [day, month, year] = date.split("-");
      const formattedDeadline = `${year}-${month}-${day}T${time}:00`;
      deadlineTime = new Date(formattedDeadline).getTime();
    }

    const currentTime = new Date().getTime();
    const timeUntilDeadline = deadlineTime - currentTime;

    if (timeUntilDeadline > 0) {
      model.timeouts.set(
        "timeout_" + taskId,
        setTimeout(() => this.sendNotification(taskId), timeUntilDeadline)
      );
    }
  }

  removeNotification(taskId) {
    let timeoutToClear = "timeout_" + taskId;

    if (model.timeouts.has(timeoutToClear)) {
      clearTimeout(model.timeouts.get(timeoutToClear));
      model.timeouts.delete(timeoutToClear);
    }
  }

  sendNotification(taskId) {
    const task = model.list.find((t) => t.id === taskId);
    if (!task) return;

    if (this.browserDetection() === "Chrome") {
      this.firePopup(`Deadline is now : ${task.text}`, 6000);
    } else {
      console.log("Notifications support: ", this.notificationSupported);
      new Notification("Todo Reminder", {
        body: `Deadline is now : ${task.text}`,
      });
    }
  }

  addTask(e) {
    if (e.key === "Enter" || e.code === "NumpadEnter") {
      e.preventDefault();
      this.processTask();
    }
  }

  handleMobileInput(e) {
    if (e.inputType === "insertText" && e.data === "\n") {
      e.preventDefault();
      this.processTask();
    }
  }

  processTask() {
    let inputField = document.getElementById("add-item");
    let inputValue = inputField.value.trim();

    if (!inputValue) return;
    //prettier-ignore
    if (model.list.some((i) => i.text.toLowerCase() === inputValue.toLowerCase())) {
      this.firePopup("Task already exists", 5000);
      return;
    }

    this.addItem(new Task(inputValue));
    inputField.value = "";
  }

  searchTask(e) {
    if (e.key === "Enter" || e.key === "NumpadEnter" || e.key === "Done") {
      e.preventDefault();
      let inputValue = document.getElementById("search-item").value.trim();
      if (inputValue) {
        this.searchItem(inputValue);
      }
    }
  }

  sortItems() {
    return model.list.sort((a, b) => Number(a.completed) - Number(b.completed));
  }

  addItem(task) {
    model.list.push(task);
    this.sortItems();
    document.getElementById("add-item").value = "";
    this.updateView();
  }

  completeItem(listItem) {
    listItem.completed = !listItem.completed;
    listItem.priority = false;
    delete listItem.deadline;
    this.removeNotification(listItem.id);
    this.sortItems();
    this.updateView();
  }

  deleteItem(listItem) {
    model.list = model.list.filter(
      (remainItem) => remainItem.text !== listItem.text
    );
    this.removeNotification(listItem.id);
    this.updateView();
  }

  prioritizeItem(listItem) {
    listItem.priority = !listItem.priority;
    model.list.sort((a, b) => Number(b.priority) - Number(a.priority));
    this.updateView();
  }

  editItem(listItem, e) {
    const listItemElement = e.target
      .closest(".item")
      .querySelector(".item-text");

    const input = document.createElement("input");
    input.type = "text";
    input.value = listItem.text;
    input.className = "edit-input";
    input.name = "edit-input";
    listItemElement.innerHTML = "";
    listItemElement.appendChild(input);
    input.focus();

    const handleEditSubmit = (e) => {
      if (
        e.key === "Enter" ||
        e.code === "NumpadEnter" ||
        (e.inputType === "insertText" && e.data === "\n")
      ) {
        e.preventDefault();
        if (input.value.trim() !== "") {
          listItem.text = input.value.trim();
        }
        this.updateView();
      }
    };
    input.addEventListener("keydown", handleEditSubmit);
    input.addEventListener("input", handleEditSubmit);
  }

  searchItem(query) {
    model.search = model.list.filter((task) =>
      task.text.toLowerCase().includes(query.toLowerCase())
    );
    document.getElementById("search-item").value = "";

    if (model.search.length) {
      this.view.render(model.search);
    } else {
      this.view.renderEmpty("Nothing found...");
    }
  }

  save() {
    localStorage.setItem("todos", JSON.stringify(model.list));
  }

  updateView() {
    this.view.render(model.list);
    this.save();
  }

  firePopup(text, timeout) {
    const popup = document.getElementById("popup");
    const popupText = document.querySelector(".notification-text");
    popupText.textContent = text;

    popup.classList.add("active");
    setTimeout(() => {
      document.getElementById("popup").classList.remove("active");
    }, timeout);
  }

  performNavigation() {
    return (window.location.href = "#/todos/");
  }

  browserDetection() {
    const browser = Bowser.getParser(window.navigator.userAgent);
    let data = browser.getBrowser();

    if (data) {
      return data.name;
    } else {
      return "Unable to detect browser";
    }
  }

  setColor(element, color) {
    element.style.setProperty("--color", color);
  }
  removeColor(element) {
    element.style.removeProperty("--color");
  }

  async changeCalendarTheme(theme) {
    const themeMap = {
      dark: () => import("flatpickr/dist/themes/dark.css"),
      material_blue: () => import("flatpickr/dist/themes/material_blue.css"),
      material_green: () => import("flatpickr/dist/themes/material_green.css"),
      material_red: () => import("flatpickr/dist/themes/material_red.css"),
      material_orange: () =>
        import("flatpickr/dist/themes/material_orange.css"),
      airbnb: () => import("flatpickr/dist/themes/airbnb.css"),
      confetti: () => import("flatpickr/dist/themes/confetti.css"),
    };

    if (themeMap[theme]) {
      await themeMap[theme]();
    }
  }
}

const view = new View();
const controller = new Controller(view);
controller.init();

const taskInput = document.getElementById("add-item");
const searchInput = document.getElementById("search-item");
const backIcon = document.querySelector(".icon-back");
const colorsContainer = document.querySelector(".colors");
const elements = Array.from(document.querySelectorAll("[data-color]"));

taskInput.addEventListener("keydown", (e) => controller.addTask(e));
taskInput.addEventListener("input", (e) => controller.handleMobileInput(e));
taskInput.addEventListener("change", () => controller.processTask());
searchInput.addEventListener("keydown", (e) => controller.searchTask(e));
taskInput.addEventListener("submit", (e) => {
  e.preventDefault();
  controller.processTask();
});
backIcon.addEventListener("click", () => controller.performNavigation());

colorsContainer.addEventListener("click", (e) => {
  const targetColor = e.target.getAttribute("data-background-color");
  if (targetColor == "original") {
    elements.forEach((element) => controller.removeColor(element));
    localStorage.removeItem("colorScheme");
  } else {
    elements.forEach((element) => controller.setColor(element, targetColor));
    localStorage.setItem("colorScheme", targetColor);
  }
});

document.addEventListener("DOMContentLoaded", (event) => {
  const savedColor = localStorage.getItem("colorScheme");
  if (savedColor) {
    elements.forEach((element) => controller.setColor(element, savedColor));
  }
});

document.getElementById("calendar-themes").addEventListener("change", (e) => {
  let selectedTheme = e.target.value;
  controller.changeCalendarTheme(selectedTheme);
});

export default controller;
