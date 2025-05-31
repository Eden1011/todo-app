const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
            index: true,
        },
        userId: {
            type: Number, // authId from auth-service
            required: true,
            index: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxLength: 2000,
        },
        messageType: {
            type: String,
            enum: ["text", "system", "file", "image"],
            default: "text",
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed, // For file info, system message data, etc.
            default: {},
        },
        isEdited: {
            type: Boolean,
            default: false,
        },
        editedAt: {
            type: Date,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    },
);

// Compound indexes for efficient queries
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ chatId: 1, isDeleted: 1, createdAt: -1 });
messageSchema.index({ userId: 1, createdAt: -1 });

// Methods
messageSchema.methods.softDelete = function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
};

messageSchema.methods.markAsEdited = function () {
    this.isEdited = true;
    this.editedAt = new Date();
    return this.save();
};

// Query helpers
messageSchema.query.notDeleted = function () {
    return this.where({ isDeleted: { $ne: true } });
};

module.exports = mongoose.model("Message", messageSchema);
