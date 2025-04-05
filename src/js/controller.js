import Bowser from "bowser";
import flatpickr from "flatpickr";
import { Task, model } from "./model.js";
import Router from "./router.js";
import View from "./view.js";

//prettier-ignore
let day = new Date().getDate() < 10 ? "0" + new Date().getDate() : new Date().getDate();
let month = new Date().toString().split(" ")[1];
let year = new Date().getFullYear().toString();

const title = document.querySelector("h1");
title.textContent = `${day} ${month} ${year}`;

function checkNotificationSupport() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    console.log("This browser does not support desktop notifications.");
    return false;
  }

  if (Notification.permission === "granted") {
    console.log("Notification permission granted.");
    registerServiceWorker();
    return true;
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        console.log("Notification permission granted after request.");
        registerServiceWorker();
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

async function registerServiceWorker() {
  try {
    // Use relative path without leading slash
    const registration = await navigator.serviceWorker.register("sw.js", {
      scope: "/my-todos/",
    });
    console.log("Service Worker registered");
    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
}

class Controller {
  constructor(view) {
    this.view = view;
    new Router(this);
    this.handleDeadlineChange = null;
    this.handleDetailsKeydown = null;
    this.notificationSupported = checkNotificationSupport();
    this.isMobile = this.detectMobile();
  }

  detectMobile() {
    return /android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  init() {
    const savedTodos = localStorage.getItem("todos");
    if (savedTodos) {
      model.list = JSON.parse(savedTodos);
    }

    const savedColor = localStorage.getItem("colorScheme");
    if (savedColor) {
      const elements = Array.from(document.querySelectorAll("[data-color]"));
      elements.forEach((element) => this.setColor(element, savedColor));
    }

    const savedTheme = localStorage.getItem("calendarTheme");
    if (savedTheme) {
      document.getElementById("calendar-themes").value = savedTheme;
      this.changeCalendarTheme(savedTheme);
    }

    if (this.isMobile) {
      this.setupMobileView();
    }

    this.view.render(model.list);
    this.setupEventListeners();
  }

  setupMobileView() {
    const deadlineInput = document.getElementById("datetime-custom");
    if (deadlineInput) {
      deadlineInput.type = "datetime-local";
      deadlineInput.min = new Date().toISOString().slice(0, 16);
    }

    const popup = document.getElementById("popup");
    popup.style.right = "50%";
    popup.style.transform = "translateX(50%)";

    // Only destroy flatpickr on mobile
    if (this.isMobile) {
      //prettier-ignore
      const flatpickrInstance = document.querySelector("#datetime-custom")?._flatpickr;
      if (flatpickrInstance) {
        flatpickrInstance.destroy();
      }
    }
  }

  setupEventListeners() {
    const taskInput = document.getElementById("add-item");
    const searchInput = document.getElementById("search-item");
    const todoList = document.getElementById("list");
    const eventType = this.isMobile ? "touchend" : "click";

    // Task input handlers for both mobile and desktop
    taskInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();
        this.processTask();
      }
    });

    // Add click handler for the add icon
    document.querySelector(".add-icon").addEventListener(eventType, (e) => {
      e.preventDefault();
      this.processTask();
    });

    // Mobile-specific handlers
    if (this.isMobile) {
      // Handle form submission on mobile
      taskInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.processTask();
        }
      });

      // Add submit event for mobile keyboards
      taskInput.addEventListener("submit", (e) => {
        e.preventDefault();
        this.processTask();
      });

      // Handle mobile keyboard "go" or "done" button
      taskInput.addEventListener("blur", (e) => {
        if (taskInput.value.trim()) {
          this.processTask();
        }
      });

      taskInput.addEventListener("input", (e) => {
        if (e.inputType === "insertText" && e.data === "\n") {
          e.preventDefault();
          this.processTask();
        }
      });

      searchInput.addEventListener("input", (e) => {
        const value = e.target.value.trim();
        if (value && e.inputType === "insertText" && e.data === "\n") {
          e.preventDefault();
          this.searchItem(value);
        }
      });

      todoList.addEventListener("touchend", (e) => {
        const target = e.target;
        if (!target.matches("ion-icon")) return;

        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling

        const item = target.closest(".item");
        if (!item) return;

        // Add a small delay to ensure the UI updates properly on mobile
        setTimeout(() => {
          const taskId = item.dataset.id;
          const task = this.findTask(taskId);
          if (!task) return;

          switch (target.getAttribute("name")) {
            case "checkmark-outline":
              this.completeItem(task);
              break;
            case "trash-outline":
              this.deleteItem(task);
              break;
            case "star-outline":
            case "star":
              // Force icon update for star
              target.setAttribute(
                "name",
                target.getAttribute("name") === "star-outline"
                  ? "star"
                  : "star-outline"
              );
              this.prioritizeItem(task);
              break;
            case "create-outline":
              this.editItem(task, e);
              break;
            case "alarm-outline":
              this.showTaskDetails(task.id);
              break;
          }
        }, 10);
      });

      // Handle search on mobile
      searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.processSearch();
        }
      });

      // Add submit event for mobile search
      searchInput.addEventListener("submit", (e) => {
        e.preventDefault();
        this.processSearch();
      });

      // Handle mobile keyboard "go" or "done" button for search
      searchInput.addEventListener("blur", (e) => {
        if (searchInput.value.trim()) {
          this.processSearch();
        }
      });

      searchInput.addEventListener("input", (e) => {
        if (e.inputType === "insertText" && e.data === "\n") {
          e.preventDefault();
          this.processSearch();
        }
      });
    } else {
      taskInput.addEventListener("keydown", (e) => this.addTask(e));
      taskInput.addEventListener("input", (e) => this.handleMobileInput(e));
      searchInput.addEventListener("keydown", (e) => this.searchTask(e));
    }

    document.querySelector(".icon-back")?.addEventListener(eventType, (e) => {
      e.preventDefault();
      this.performNavigation();
    });

    document.querySelector(".colors")?.addEventListener(eventType, (e) => {
      e.preventDefault();
      this.handleColorChange(e);
    });

    document
      .getElementById("calendar-themes")
      .addEventListener("change", (e) => {
        let selectedTheme = e.target.value;
        this.changeCalendarTheme(selectedTheme);
        localStorage.setItem(
          "calendarTheme",
          selectedTheme === "Default" ? "" : selectedTheme
        );
      });
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
    if (!task) return;

    // Reset the input value first
    const deadlineInput = document.getElementById("datetime-custom");
    deadlineInput.value = "";

    document.getElementById("task-title").textContent = task.text;

    // Remove previous event listener
    if (this.handleDeadlineChange) {
      deadlineInput.removeEventListener("change", this.handleDeadlineChange);
    }

    if (this.isMobile) {
      deadlineInput.type = "datetime-local";
      deadlineInput.min = new Date().toISOString().slice(0, 16);
      if (task.deadline) {
        deadlineInput.value = task.deadline;
      }
    } else {
      if (deadlineInput._flatpickr) {
        deadlineInput._flatpickr.destroy();
      }
      this.setupFlatpickr(deadlineInput, task, taskId);
    }

    // Create new handler specifically for this task
    this.handleDeadlineChange = () => {
      const currentTask = this.findTask(taskId);
      if (!currentTask) return;

      const newDeadline = deadlineInput.value;
      if (!newDeadline) {
        delete currentTask.deadline;
        this.removeNotification(taskId);
      } else {
        currentTask.deadline = newDeadline;
        this.scheduleNotification(taskId, newDeadline);
      }

      this.save();
      this.view.render(model.list);
      this.firePopup("Deadline updated", 3000);
    };

    deadlineInput.addEventListener("change", this.handleDeadlineChange);
  }

  setupFlatpickr(input, task, taskId) {
    flatpickr(input, {
      enableTime: true,
      dateFormat: "Y-m-d H:i",
      time_24hr: true,
      minDate: "today",
      defaultDate: task.deadline || null,
      onClose: (selectedDates) => {
        if (selectedDates.length) {
          this.updateDeadline(taskId);
        }
      },
    });
  }

  updateDeadline(taskId) {
    const task = this.findTask(taskId);
    if (task) {
      let deadlineValue = document.getElementById("datetime-custom").value;

      if (!deadlineValue) {
        delete task.deadline;
        this.removeNotification(taskId);
      } else {
        task.deadline = deadlineValue;
        this.scheduleNotification(taskId, task.deadline);
      }

      this.save();
      this.view.render(model.list);
    }
  }

  updateTaskDetails(taskId, details) {
    const task = this.findTask(taskId);
    if (task) {
      task.details = details;
      this.save();
      this.view.render(model.list);
    }
  }

  scheduleNotification(taskId, deadline) {
    const task = this.findTask(taskId);
    if (!task || !deadline) return;

    this.removeNotification(taskId); // Clear existing notification

    const deadlineTime = new Date(deadline).getTime();
    const currentTime = new Date().getTime();
    const timeUntilDeadline = deadlineTime - currentTime;

    if (timeUntilDeadline > 0) {
      const timeoutId = setTimeout(() => {
        this.sendNotification(taskId);
      }, timeUntilDeadline);

      model.timeouts.set(`timeout_${taskId}`, timeoutId);
    }
  }

  async sendNotification(taskId) {
    const task = this.findTask(taskId);
    if (!task) return;

    if (this.notificationSupported && Notification.permission === "granted") {
      try {
        // Use Service Worker notifications for all platforms
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("Task Deadline", {
          body: `Deadline is now: ${task.text}`,
          icon: "/favicon.ico",
          requireInteraction: true,
        });
      } catch (error) {
        console.error("Error showing notification:", error);
        this.firePopup(`Deadline is now: ${task.text}`, 6000);
      }
    }
  }

  removeNotification(taskId) {
    const timeoutKey = `timeout_${taskId}`;
    if (model.timeouts.has(timeoutKey)) {
      clearTimeout(model.timeouts.get(timeoutKey));
      model.timeouts.delete(timeoutKey);
    }
  }

  handleMobileInput(e) {
    // Process task when Enter is pressed on mobile keyboard
    if (e.inputType === "insertText" && e.data === "\n") {
      e.preventDefault();
      this.processTask();
    }
  }

  addTask(e) {
    if (
      this.isMobile
        ? e.type === "touchend"
        : e.key === "Enter" || e.code === "NumpadEnter"
    ) {
      e.preventDefault();
      this.processTask();
    }
  }

  processTask() {
    const inputField = document.getElementById("add-item");
    const inputValue = inputField.value.trim();

    if (!inputValue) return;

    if (
      model.list.some(
        (item) => item.text.toLowerCase() === inputValue.toLowerCase()
      )
    ) {
      this.firePopup("Task already exists", 5000);
      return;
    }

    const task = new Task(inputValue);
    model.list.push(task);
    this.sortItems();
    inputField.value = "";
    this.updateView();
  }

  processSearch() {
    const searchValue = document.getElementById("search-item").value.trim();
    if (searchValue) {
      this.searchItem(searchValue);
    }
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
  // ... keep all other existing methods (completeItem, deleteItem, etc.) ...
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

  handleColorChange(e) {
    e.preventDefault();
    const elements = Array.from(document.querySelectorAll("[data-color]"));
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

// Initialize
const view = new View();
const controller = new Controller(view);

document.addEventListener("DOMContentLoaded", () => {
  controller.init();
});

export default controller;
