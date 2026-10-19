"use strict";

/*
 * My Expenses — static-site version
 * Storage: browser localStorage (no $BSD.db or server database required).
 * Deployable as-is to Vercel, GitHub Pages, or any static web host.
 */

(() => {
  const STORAGE_KEY = "my-expenses.v1";

  const form = document.getElementById("expense-form");
  const itemInput = document.getElementById("item-name");
  const amountInput = document.getElementById("item-cost");
  const expensesDiv = document.getElementById("expenses");
  const totalHeading = document.getElementById("total-expenses");
  const emptyState = document.getElementById("empty-state");
  const formMessage = document.getElementById("form-message");

  // Change this to another locale/currency if desired, e.g. "en-MY" and "MYR".
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  });

  function formatMoney(amount) {
    return currencyFormatter.format(amount);
  }

  function readExpenses() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];

      // Ignore malformed records instead of breaking the whole app.
      return parsed.filter((expense) =>
        expense &&
        typeof expense.id === "string" &&
        typeof expense.description === "string" &&
        expense.description.trim() !== "" &&
        Number.isFinite(Number(expense.amount)) &&
        Number(expense.amount) >= 0
      ).map((expense) => ({
        id: expense.id,
        description: expense.description,
        amount: Number(expense.amount),
        createdAt: Number(expense.createdAt) || 0
      }));
    } catch (error) {
      console.error("Could not read expenses from localStorage:", error);
      showMessage("Saved expenses could not be read. Check your browser storage settings.");
      return [];
    }
  }

  function writeExpenses(expenses) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
      return true;
    } catch (error) {
      console.error("Could not save expenses to localStorage:", error);
      showMessage("Could not save your expense. Your browser storage may be unavailable or full.");
      return false;
    }
  }

  function showMessage(message) {
    formMessage.textContent = message;
  }

  function renderExpenses() {
    const expenses = readExpenses();
    expensesDiv.replaceChildren();

    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    totalHeading.textContent = `Total Expenses: ${formatMoney(total)}`;
    emptyState.hidden = expenses.length > 0;

    // Newest expenses appear first.
    expenses
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((expense) => {
        const row = document.createElement("div");
        row.className = "expense";

        const details = document.createElement("div");
        details.className = "expense-details";

        const name = document.createElement("div");
        name.className = "expense-name";
        // textContent prevents item names from being interpreted as HTML.
        name.textContent = expense.description;

        const amount = document.createElement("span");
        amount.className = "expense-amount";
        amount.textContent = formatMoney(expense.amount);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete ${expense.description}`);
        deleteButton.addEventListener("click", () => deleteExpense(expense.id));

        details.append(name, amount);
        row.append(details, deleteButton);
        expensesDiv.appendChild(row);
      });
  }

  function saveExpense(event) {
    event.preventDefault();
    showMessage("");

    const description = itemInput.value.trim();
    const amount = Number(amountInput.value);

    if (!description) {
      showMessage("Please enter the name of the item.");
      itemInput.focus();
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showMessage("Please enter a cost greater than $0.00.");
      amountInput.focus();
      return;
    }

    const expenses = readExpenses();
    expenses.push({
      id: createId(),
      description,
      // Round to cents to avoid common floating-point currency errors.
      amount: Math.round((amount + Number.EPSILON) * 100) / 100,
      createdAt: Date.now()
    });

    if (!writeExpenses(expenses)) return;

    form.reset();
    itemInput.focus();
    renderExpenses();
    showMessage("Expense added.");
  }

  function deleteExpense(id) {
    const expenses = readExpenses();
    const updatedExpenses = expenses.filter((expense) => expense.id !== id);

    if (updatedExpenses.length === expenses.length) return;
    if (writeExpenses(updatedExpenses)) {
      renderExpenses();
      showMessage("Expense deleted.");
    }
  }

  function createId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `expense-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  form.addEventListener("submit", saveExpense);

  // Show any previously saved expenses on page load.
  renderExpenses();
})();
