const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => nanoid() }, // keep short string IDs, not ObjectId
    username: {
      type: String,
      required: true,
      unique: true,
      match: /^[a-zA-Z0-9_]{3,20}$/,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    avatar_url: { type: String, default: null },
    avatar_public_id: { type: String, default: null }, // Cloudinary public_id, to replace/delete old uploads
    reset_password_token: { type: String, default: null, select: false }, // sha256 hash of the raw token emailed to the user
    reset_password_expires: { type: Date, default: null, select: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password_hash;
        delete ret.avatar_public_id;
        delete ret.reset_password_token;
        delete ret.reset_password_expires;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
