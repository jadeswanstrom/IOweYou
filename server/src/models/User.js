import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },

    // combined field
    name: { type: String, default: "", trim: true },

    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    // PayPal.Me username for THIS user (just the username, not the full link)
    // Example with my name for later: "JadeSwanstrom" = creates https://paypal.me/JadeSwanstrom/25CAD
    paypalMe: { type: String, default: "", trim: true },

    // currency code to append on PayPal.Me links
    currency: { type: String, default: "CAD", trim: true, uppercase: true },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
