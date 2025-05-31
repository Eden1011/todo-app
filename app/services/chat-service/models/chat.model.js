const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
    {
        projectId: {
            type: Number,
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxLength: 100,
        },
        description: {
            type: String,
            trim: true,
            maxLength: 500,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: Number, // authId from auth-service
            required: true,
        },
        lastActivity: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    },
);

// Compound index for efficient queries
chatSchema.index({ projectId: 1, isActive: 1 });
chatSchema.index({ projectId: 1, createdAt: -1 });

// Update lastActivity when messages are sent
chatSchema.methods.updateActivity = function () {
    this.lastActivity = new Date();
    return this.save();
};

module.exports = mongoose.model("Chat", chatSchema);
