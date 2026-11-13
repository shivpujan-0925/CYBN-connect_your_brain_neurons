const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const problemSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => nanoid() },
    user_id: { type: String, required: true, ref: 'User', index: true },

    name: { type: String, required: true, trim: true, maxlength: 200 },
    topic: { type: String, default: null, maxlength: 100 },
    pattern: { type: String, default: null, maxlength: 100 },
    time_complexity: { type: String, default: null, maxlength: 50 },
    space_complexity: { type: String, default: null, maxlength: 50 },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    notes: { type: String, default: null, maxlength: 10000 },
    link: { type: String, default: null, maxlength: 1000 },

    current_stage: { type: Number, default: 0 }, // 0..5, which day the problem is currently on
    status: { type: String, enum: ['active', 'mastered'], default: 'active' },

    day0_completed_at: { type: Date, default: null }, // first-solve timestamp, set at creation
    day1_due_at: { type: Date, default: null },
    day1_completed_at: { type: Date, default: null },
    day2_due_at: { type: Date, default: null },
    day2_completed_at: { type: Date, default: null },
    day3_due_at: { type: Date, default: null },
    day3_completed_at: { type: Date, default: null },
    day4_due_at: { type: Date, default: null },
    day4_completed_at: { type: Date, default: null },
    day5_due_at: { type: Date, default: null },
    day5_completed_at: { type: Date, default: null }, // mastery tick

    restart_count: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

problemSchema.index({ user_id: 1, status: 1 });

module.exports = mongoose.model('Problem', problemSchema);
