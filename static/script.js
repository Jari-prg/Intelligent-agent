
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const welcomeScreen = document.getElementById("welcomeScreen");
const sendBtn = document.getElementById("sendBtn");
const historyList = document.getElementById("historyList");

let selectedTone = "Professional";
let conversations = [];
let activeConversationId = null;


// Change response tone
document.querySelectorAll(".tone-option").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".tone-option").forEach(option => {
            option.classList.remove("active");
        });

        button.classList.add("active");
        selectedTone = button.dataset.tone;
    });
});


// Suggested prompts
document.querySelectorAll(".suggestion-card").forEach(button => {
    button.addEventListener("click", () => {
        messageInput.value = button.dataset.prompt;
        messageInput.focus();
        resizeInput();
    });
});


// Adjust the input height
messageInput.addEventListener("input", resizeInput);

function resizeInput() {
    messageInput.style.height = "auto";

    messageInput.style.height =
        Math.min(messageInput.scrollHeight, 130) + "px";
}


// Enter sends; Shift + Enter creates a new line
messageInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        chatForm.requestSubmit();
    }
});


// Create a message bubble
function addMessage(role, text) {
    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = role === "user" ? "Y" : "✦";

    const content = document.createElement("div");
    content.className = "message-content";

    const name = document.createElement("div");
    name.className = "message-name";
    name.textContent = role === "user" ? "YOU" : "INTELLICHAT";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;

    content.append(name, bubble);
    row.append(avatar, content);
    messages.appendChild(row);

    scrollToBottom();

    return bubble;
}


// Animate the AI response character by character
function streamText(element, text) {
    return new Promise(resolve => {
        let index = 0;

        const timer = setInterval(() => {
            element.textContent += text.charAt(index);
            index++;

            scrollToBottom();

            if (index >= text.length) {
                clearInterval(timer);
                resolve();
            }
        }, 12);
    });
}


// Keep the latest message visible
function scrollToBottom() {
    const chatArea = document.getElementById("chatArea");
    chatArea.scrollTop = chatArea.scrollHeight;
}


// Update the history sidebar
function renderHistory() {
    historyList.innerHTML = "";

    if (conversations.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-history";
        empty.textContent = "Your conversations will appear here.";
        historyList.appendChild(empty);
        return;
    }

    [...conversations].reverse().forEach(conversation => {
        const button = document.createElement("button");

        button.className = "history-item";
        button.textContent = conversation.title;
        button.title = conversation.title;

        if (conversation.id === activeConversationId) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {
            loadConversation(conversation.id);
        });

        historyList.appendChild(button);
    });
}


// Start a new conversation
document.getElementById("newChatBtn").addEventListener("click", () => {
    activeConversationId = null;
    messages.innerHTML = "";
    welcomeScreen.hidden = false;

    renderHistory();
    messageInput.focus();
});


// Open an earlier conversation in this session
function loadConversation(id) {
    const conversation = conversations.find(item => item.id === id);

    if (!conversation) return;

    activeConversationId = id;
    messages.innerHTML = "";
    welcomeScreen.hidden = true;

    conversation.messages.forEach(message => {
        addMessage(message.role, message.text);
    });

    renderHistory();
}


// Send a message to Flask
chatForm.addEventListener("submit", async event => {
    event.preventDefault();

    const message = messageInput.value.trim();

    if (!message || sendBtn.disabled) return;

    if (!activeConversationId) {
        activeConversationId = String(Date.now());

        conversations.push({
            id: activeConversationId,
            title: message.length > 28
                ? message.slice(0, 28) + "..."
                : message,
            messages: []
        });
    }

    const conversation = conversations.find(
        item => item.id === activeConversationId
    );

    conversation.messages.push({
        role: "user",
        text: message
    });

    welcomeScreen.hidden = true;

    addMessage("user", message);

    messageInput.value = "";
    resizeInput();

    sendBtn.disabled = true;

    const responseBubble = addMessage("assistant", "Thinking...");

    try {
        const response = await fetch("/chat", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: message,
                tone: selectedTone
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Request failed");
        }

        responseBubble.textContent = "";

        await streamText(responseBubble, data.response);

        conversation.messages.push({
            role: "assistant",
            text: data.response
        });

    } catch (error) {
        responseBubble.textContent =
            "Could not connect to the backend. Please check that Flask is running.";

        console.error(error);

    } finally {
        sendBtn.disabled = false;
        renderHistory();
        messageInput.focus();
    }
});
