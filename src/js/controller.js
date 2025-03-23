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
    this.handleDeadlineChange = null;
    this.handleDetailsKeydown = null;
    this.notificationSupported = checkNotificationSupport();
    // this.isMobile = window.matchMedia("(max-width: 320px)").matches;
    this.isMobile = this.detectMobile();
  }

  detectMobile() {
    const userAgent = navigator.userAgent || window.opera;
    return /android|iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
  }

  init() {
    const savedTodos = localStorage.getItem("todos");

    if (savedTodos) {
      model.list = JSON.parse(savedTodos);
    }
    const savedColor = localStorage.getItem("colorScheme");
    if (savedColor) {
      elements.forEach((element) => controller.setColor(element, savedColor));
    }
    const savedTheme = localStorage.getItem("calendarTheme");
    if (savedTheme) {
      controller.changeCalendarTheme(savedTheme);
    }
    document.getElementById("calendar-themes").value = savedTheme || "Default";

    if (this.isMobile) {
      this.destroyFlatpickr();
      this.adjustNotificationPosition();
    }
    this.view.render(model.list);
    this.addTouchEventListeners();
  }

  addTouchEventListeners() {
    const taskInput = document.getElementById("add-item");
    const searchInput = document.getElementById("search-item");
    const todoList = document.getElementById("list");

    // Add task events
    taskInput.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.processTask();
    });

    //Search task events
    searchInput.addEventListener("touchend", (e) => {
      e.preventDefault();
      const inputValue = searchInput.value.trim();
      if (inputValue) {
        this.searchItem(inputValue);
      }
    });

    //Todo list item events
    todoList.addEventListener("touchend", (e) => {
      const target = e.target;
      const item = target.closest(".item");
      if (!item) return;

      const taskText = item.querySelector(".item-text").textContent;
      const task = model.list.find((t) => t.text === taskText);

      if (target.classList.contains("complete-btn")) {
        this.completeItem(task);
      } else if (target.classList.contains("delete-btn")) {
        this.deleteItem(task);
      } else if (target.classList.contains("priority-btn")) {
        this.prioritizeItem(task);
      } else if (target.classList.contains("edit-btn")) {
        this.editItem(task, e);
      } else if (target.classList.contains("details-btn")) {
        this.showTaskDetails(task.id);
      }
    });
  }

  destroyFlatpickr() {
    const flatpickrInstance =
      document.querySelector("#datetime-custom")._flatpickr;
    if (flatpickrInstance) {
      flatpickrInstance.destroy();
    }
  }

  adjustNotificationPosition() {
    const popup = document.getElementById("popup");
    popup.style.right = "50%";
    popup.style.transform = "translateX(50%)";
  }

  showTodoList() {
    document.getElementById("todo").style.display = "block";
    document.getElementById("task-details").style.display = "none";
    this.view.render(model.list);
  }

  showTaskDetails(taskId) {
    document.getElementById("todo").style.display = "none";
    document.getElementById("task-details").style.display = "flex";

    const task = this.findTask(taskId);
    if (task) {
      document.getElementById("task-title").textContent = task.text;

      if (!this.isMobile) {
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
      }

      const deadlineInput = document.getElementById("datetime-custom");

      let storedDate = "";
      let storedTime = "";

      if (task.deadline) {
        const [date, time] = task.deadline.split("T");
        storedDate = date || "";
        storedTime = time ? time.slice(0, 5) : ""; // Extract only the time part (HH:mm)
      }

      deadlineInput.value = `${storedDate} ${storedTime}`.trim();

      //Remove any existing event listeners before adding a new one
      if (this.handleDeadlineChange) {
        deadlineInput.removeEventListener("change", this.handleDeadlineChange);
      }
      this.handleDeadlineChange = () => this.updateDeadline(taskId);
      deadlineInput.addEventListener("change", this.handleDeadlineChange);

      const detailsTextarea = document.getElementById("task-details-text");
      detailsTextarea.value = task.details || "";

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

  updateDeadline(taskId) {
    const task = this.findTask(taskId);
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
    const task = this.findTask(taskId);
    if (task) {
      task.details = details;
      localStorage.setItem("todos", JSON.stringify(model.list));
    }
  }

  scheduleNotification(taskId, deadline) {
    const task = this.findTask(taskId);
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
    const task = this.findTask(taskId);
    if (!task) return;

    const browserName = this.browserDetection();
    if (this.isMobile || browserName === "Chrome") {
      this.firePopup(`Deadline is now : ${task.text}`, 6000);
    } else {
      new Notification("My todos reminder", {
        body: `Deadline is now : ${task.text}`,
      });
    }
  }

  addTask(e) {
    if (
      e.type === "touchend" ||
      e.key === "Enter" ||
      e.code === "NumpadEnter" ||
      e.key === "Done"
    ) {
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
    if (
      e.type === "touchend" ||
      e.key === "Enter" ||
      e.key === "NumpadEnter" ||
      e.key === "Done"
    ) {
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
    input.addEventListener("touchstart", handleEditSubmit);
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
      popup.classList.remove("active");
    }, timeout);
  }

  performNavigation() {
    return (window.location.href = "#/todos/");
  }

  findTask(taskId) {
    return model.list.find((t) => t.id === taskId);
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
      material_blue: () => import("flatpickr/dist/themes/material_blue.css"),
      material_green: () => import("flatpickr/dist/themes/material_green.css"),
      material_red: () => import("flatpickr/dist/themes/material_red.css"),
      material_orange: () =>
        import("flatpickr/dist/themes/material_orange.css"),
      airbnb: () => import("flatpickr/dist/themes/airbnb.css"),
      confetti: () => import("flatpickr/dist/themes/confetti.css"),
    };
    // Remove the existing theme stylesheet if it exists
    const existingThemeLink = document.getElementById("flatpickr-theme");
    if (existingThemeLink) {
      existingThemeLink.remove();
    }
    // Remove all flatpicker style tags with theme colors
    if (theme == "Default") {
      const existingStyleTags = document.querySelectorAll(
        'style[data-vite-dev-id*="/flatpickr/dist/themes"]'
      );
      if (existingStyleTags) {
        existingStyleTags.forEach((tag) => tag.remove());
      }
    }

    // Add the new theme stylesheet
    if (themeMap[theme] && theme !== "Default") {
      await themeMap[theme]();
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.id = "flatpickr-theme";
      link.href = `https://npmcdn.com/flatpickr/dist/themes/${theme}.css`;
      document.head.appendChild(link);
    }
  }
}

const view = new View();
const controller = new Controller(view);
document.addEventListener("DOMContentLoaded", (event) => {
  controller.init();
});

const taskInput = document.getElementById("add-item");
const searchInput = document.getElementById("search-item");
const backIcon = document.querySelector(".icon-back");
const colorsContainer = document.querySelector(".colors");
const elements = Array.from(document.querySelectorAll("[data-color]"));

// Handle both desktop and mobile events
if (!controller.isMobile) {
  taskInput.addEventListener("keydown", (e) => controller.addTask(e));
  taskInput.addEventListener("input", (e) => controller.handleMobileInput(e));
  taskInput.addEventListener("change", () => controller.processTask());
  searchInput.addEventListener("keydown", (e) => controller.searchTask(e));
}

backIcon.addEventListener(controller.isMobile ? "touchend" : "click", (e) => {
  e.preventDefault();
  controller.performNavigation();
});

colorsContainer.addEventListener(
  controller.isMobile ? "touchend" : "click",
  (e) => {
    e.preventDefault();
    document.getElementById("toggle1").checked = false;
    const targetColor = e.target.getAttribute("data-background-color");
    if (targetColor == "original") {
      elements.forEach((element) => controller.removeColor(element));
      localStorage.removeItem("colorScheme");
    } else {
      elements.forEach((element) => controller.setColor(element, targetColor));
      localStorage.setItem("colorScheme", targetColor);
    }
  }
);

document.getElementById("calendar-themes").addEventListener("change", (e) => {
  let selectedTheme = e.target.value;
  controller.changeCalendarTheme(selectedTheme);
  if (selectedTheme == "Default") {
    localStorage.removeItem("calendarTheme");
  } else {
    localStorage.setItem("calendarTheme", selectedTheme);
  }
});

export default controller;
