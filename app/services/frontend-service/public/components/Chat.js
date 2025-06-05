const { useState, useEffect, useRef } = React;

function Chat({ user }) {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        loadProjects();
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    useEffect(() => {
        if (selectedProject) {
            loadProjectChats();
            connectToSocket();
        } else {
            disconnectSocket();
        }
    }, [selectedProject]);

    useEffect(() => {
        if (selectedChat) {
            loadChatMessages();
            if (socket && selectedProject) {
                socket.emit("join_project", { projectId: selectedProject.id });
            }
        }
    }, [selectedChat, socket]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadProjects = async () => {
        try {
            const response = await API.getProjects();
            setProjects(response.data.projects);
            if (response.data.projects.length > 0) {
                setSelectedProject(response.data.projects[0]);
            }
        } catch (error) {
            console.error("Error loading projects:", error);
            setError("Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    const loadProjectChats = async () => {
        if (!selectedProject) return;

        try {
            const response = await API.getProjectChats(selectedProject.id);
            setChats(response.data.chats);

            const defaultChatResponse = await API.getOrCreateProjectChat(
                selectedProject.id,
            );
            if (defaultChatResponse.data.chat) {
                setSelectedChat(defaultChatResponse.data.chat);
            }
        } catch (error) {
            console.error("Error loading chats:", error);
            setError("Failed to load chats");
        }
    };

    const loadChatMessages = async () => {
        if (!selectedChat) return;

        try {
            const response = await API.getChatMessages(selectedChat.id, {
                limit: 50,
                sortOrder: "asc",
            });
            setMessages(response.data.messages);
        } catch (error) {
            console.error("Error loading messages:", error);
            setError("Failed to load messages");
        }
    };

    const connectToSocket = () => {
        if (socket) {
            socket.disconnect();
        }

        const token = AuthUtils.getToken();
        if (!token) return;

        const newSocket = io("http://localhost:5000", {
            auth: {
                token: token,
            },
        });

        newSocket.on("connect", () => {
            console.log("Connected to chat service");
            setIsConnected(true);
            if (selectedProject) {
                newSocket.emit("join_project", {
                    projectId: selectedProject.id,
                });
            }
        });

        newSocket.on("disconnect", () => {
            console.log("Disconnected from chat service");
            setIsConnected(false);
        });

        newSocket.on("joined_project", (data) => {
            console.log("Joined project room:", data);
            newSocket.emit("get_online_users", {
                projectId: selectedProject.id,
            });
        });

        newSocket.on("new_message", (data) => {
            if (
                data.success &&
                selectedChat &&
                data.data.chatId === selectedChat.id
            ) {
                setMessages((prev) => [...prev, data.data]);
            }
        });

        newSocket.on("message_edited", (data) => {
            if (
                data.success &&
                selectedChat &&
                data.data.chatId === selectedChat.id
            ) {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === data.data.id ? data.data : msg,
                    ),
                );
            }
        });

        newSocket.on("message_deleted", (data) => {
            if (
                data.success &&
                selectedChat &&
                data.chatId === selectedChat.id
            ) {
                setMessages((prev) =>
                    prev.filter((msg) => msg.id !== data.messageId),
                );
            }
        });

        newSocket.on("user_typing", (data) => {
            if (
                data.userId !== user.id &&
                selectedChat &&
                data.chatId === selectedChat.id
            ) {
                setTypingUsers((prev) => {
                    const newSet = new Set(prev);
                    if (data.isTyping) {
                        newSet.add(data.userId);
                    } else {
                        newSet.delete(data.userId);
                    }
                    return newSet;
                });
            }
        });

        newSocket.on("online_users", (data) => {
            if (data.success) {
                setOnlineUsers(data.onlineUsers);
            }
        });

        newSocket.on("error", (error) => {
            console.error("Socket error:", error);
            setError("Connection error: " + error.error);
        });

        setSocket(newSocket);
    };

    const disconnectSocket = () => {
        if (socket) {
            socket.disconnect();
            setSocket(null);
            setIsConnected(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || !socket) return;

        const messageContent = newMessage.trim();
        setNewMessage("");

        socket.emit("send_message", {
            chatId: selectedChat.id,
            content: messageContent,
            messageType: "text",
        });

        if (isTyping) {
            socket.emit("typing_stop", { chatId: selectedChat.id });
            setIsTyping(false);
        }
    };

    const handleTyping = (value) => {
        setNewMessage(value);

        if (!socket || !selectedChat) return;

        if (!isTyping) {
            socket.emit("typing_start", { chatId: selectedChat.id });
            setIsTyping(true);
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            if (socket && selectedChat) {
                socket.emit("typing_stop", { chatId: selectedChat.id });
                setIsTyping(false);
            }
        }, 2000);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return "Today";
        } else if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        } else {
            return date.toLocaleDateString();
        }
    };

    const groupMessagesByDate = (messages) => {
        const groups = {};
        messages.forEach((message) => {
            const date = formatDate(message.createdAt);
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(message);
        });
        return groups;
    };

    const handleRefreshChat = () => {
        window.location.reload();
    };

    if (loading) {
        return <div className="loading">Loading chat...</div>;
    }

    return (
        <div className="content">
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                }}
            >
                <h1>Project Chat</h1>
                <button
                    onClick={handleRefreshChat}
                    className="btn btn-secondary"
                >
                    Refresh Chat
                </button>
            </div>

            {error && <div className="error">{error}</div>}

            <div style={{ display: "flex", gap: "1rem", height: "600px" }}>
                {/* Project Selector */}
                <div
                    style={{
                        width: "200px",
                        borderRight: "1px solid #eee",
                        paddingRight: "1rem",
                    }}
                >
                    <h3>Projects</h3>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                        }}
                    >
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className={`sidebar-item ${selectedProject?.id === project.id ? "active" : ""}`}
                                onClick={() => setSelectedProject(project)}
                            >
                                <div style={{ fontWeight: "500" }}>
                                    {project.name}
                                </div>
                                <div
                                    style={{
                                        fontSize: "0.875rem",
                                        color: "#666",
                                    }}
                                >
                                    {project._count.members} members
                                </div>
                            </div>
                        ))}
                    </div>

                    {selectedProject && (
                        <div style={{ marginTop: "2rem" }}>
                            <h4>Online Users</h4>
                            <div
                                style={{ fontSize: "0.875rem", color: "#666" }}
                            >
                                {onlineUsers.length} online
                                {onlineUsers.map((userId) => (
                                    <div
                                        key={userId}
                                        style={{ padding: "0.25rem 0" }}
                                    >
                                        User #{userId}
                                        {userId === user.id && " (You)"}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
                        Status:{" "}
                        <span
                            style={{
                                color: isConnected ? "#28a745" : "#dc3545",
                            }}
                        >
                            {isConnected ? "Connected" : "Disconnected"}
                        </span>
                    </div>
                </div>

                {/* Chat Area */}
                {selectedProject ? (
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {/* Chat Header */}
                        <div
                            style={{
                                padding: "1rem",
                                borderBottom: "1px solid #eee",
                                backgroundColor: "#f8f9fa",
                            }}
                        >
                            <h3>{selectedChat?.name || "General Chat"}</h3>
                            <div
                                style={{ fontSize: "0.875rem", color: "#666" }}
                            >
                                {selectedProject.name} •{" "}
                                {selectedProject._count.members} members
                            </div>
                        </div>

                        {/* Messages */}
                        <div
                            style={{
                                flex: 1,
                                overflowY: "auto",
                                padding: "1rem",
                                backgroundColor: "#fff",
                            }}
                        >
                            {selectedChat ? (
                                <>
                                    {Object.entries(
                                        groupMessagesByDate(messages),
                                    ).map(([date, dateMessages]) => (
                                        <div key={date}>
                                            <div
                                                style={{
                                                    textAlign: "center",
                                                    margin: "1rem 0",
                                                    fontSize: "0.875rem",
                                                    color: "#666",
                                                }}
                                            >
                                                {date}
                                            </div>
                                            {dateMessages.map((message) => (
                                                <div
                                                    key={message.id}
                                                    className={`chat-message ${message.userId === user.id ? "own" : ""}`}
                                                    style={{
                                                        marginBottom: "1rem",
                                                        padding: "0.75rem",
                                                        borderRadius: "8px",
                                                        backgroundColor:
                                                            message.userId ===
                                                            user.id
                                                                ? "#667eea"
                                                                : "#f8f9fa",
                                                        color:
                                                            message.userId ===
                                                            user.id
                                                                ? "white"
                                                                : "#333",
                                                        marginLeft:
                                                            message.userId ===
                                                            user.id
                                                                ? "3rem"
                                                                : "0",
                                                        marginRight:
                                                            message.userId ===
                                                            user.id
                                                                ? "0"
                                                                : "3rem",
                                                    }}
                                                >
                                                    {message.userId !==
                                                        user.id && (
                                                        <div
                                                            style={{
                                                                fontSize:
                                                                    "0.75rem",
                                                                opacity: 0.8,
                                                                marginBottom:
                                                                    "0.25rem",
                                                            }}
                                                        >
                                                            User #
                                                            {message.userId}
                                                        </div>
                                                    )}
                                                    <div>{message.content}</div>
                                                    <div
                                                        style={{
                                                            fontSize: "0.75rem",
                                                            opacity: 0.7,
                                                            marginTop:
                                                                "0.25rem",
                                                            textAlign:
                                                                message.userId ===
                                                                user.id
                                                                    ? "right"
                                                                    : "left",
                                                        }}
                                                    >
                                                        {formatTime(
                                                            message.createdAt,
                                                        )}
                                                        {message.isEdited &&
                                                            " (edited)"}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}

                                    {/* Typing indicator */}
                                    {typingUsers.size > 0 && (
                                        <div
                                            style={{
                                                fontSize: "0.875rem",
                                                color: "#666",
                                                fontStyle: "italic",
                                                padding: "0.5rem",
                                            }}
                                        >
                                            {Array.from(typingUsers)
                                                .map(
                                                    (userId) =>
                                                        `User #${userId}`,
                                                )
                                                .join(", ")}
                                            {typingUsers.size === 1
                                                ? " is"
                                                : " are"}{" "}
                                            typing...
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </>
                            ) : (
                                <div
                                    style={{
                                        textAlign: "center",
                                        color: "#666",
                                        marginTop: "2rem",
                                    }}
                                >
                                    Select a chat to start messaging
                                </div>
                            )}
                        </div>

                        {/* Message Input */}
                        {selectedChat && (
                            <form
                                onSubmit={handleSendMessage}
                                style={{
                                    display: "flex",
                                    padding: "1rem",
                                    borderTop: "1px solid #eee",
                                    backgroundColor: "#f8f9fa",
                                    gap: "0.5rem",
                                }}
                            >
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) =>
                                        handleTyping(e.target.value)
                                    }
                                    placeholder="Type a message..."
                                    style={{
                                        flex: 1,
                                        padding: "0.75rem",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                    }}
                                    disabled={!isConnected}
                                />
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={
                                        !newMessage.trim() || !isConnected
                                    }
                                >
                                    Send
                                </button>
                            </form>
                        )}
                    </div>
                ) : (
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#666",
                        }}
                    >
                        Select a project to start chatting
                    </div>
                )}
            </div>
        </div>
    );
}
