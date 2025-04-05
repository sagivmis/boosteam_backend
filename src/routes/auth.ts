import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import User from "../models/User";
import { Role } from "../models/Role";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { FReply } from "../utils";
import { authenticate, authorize } from "../middleware/auth";

// Move to environment variable
const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || "24h";

async function authRoutes(fastify: FastifyInstance) {
  // Register User
  fastify.post<{ Reply: FReply }>(
    "/auth/register",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { username, password, email } = request.body as {
        username: string;
        password: string;
        email: string;
      };

      try {
        // Input validation
        if (!username || !password || !email) {
          return reply.status(400).send({
            message: "Username, password, and email are required",
          });
        }

        if (password.length < 8) {
          return reply.status(400).send({
            message: "Password must be at least 8 characters long",
          });
        }

        // Check if email or username already exists
        const existingUser = await User.findOne({
          $or: [{ username }, { email }],
        });

        if (existingUser) {
          return reply.status(409).send({
            message: "Username or email already exists",
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Get default user role
        const userRole = await Role.findOne({ name: "user" });
        if (!userRole) {
          return reply.status(500).send({
            message: "Error setting up user role",
          });
        }

        // Create new user
        const user = new User({
          username,
          password: hashedPassword,
          email,
          roles: [userRole._id],
        });

        await user.save();
        reply.status(201).send({ message: "User registered successfully" });
      } catch (error: any) {
        console.error("Error registering user:", error);
        reply
          .status(500)
          .send({ message: "Error registering user", details: error.message });
      }
    }
  );

  // Login User
  fastify.post<{ Reply: FReply }>(
    "/auth/login",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { username, password } = request.body as {
        username: string;
        password: string;
      };

      try {
        // Find user by username or email
        const user = await User.findOne({
          $or: [{ username }, { email: username }],
        });

        if (!user) {
          return reply
            .status(401)
            .send({ message: "Invalid username or password" });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return reply
            .status(401)
            .send({ message: "Invalid username or password" });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, SECRET_KEY);

        // Update last login time
        await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

        reply.send({
          message: "Logged in successfully",
          token,
          username: user.username,
        });
      } catch (error) {
        console.error("Login error:", error);
        reply.status(500).send({ message: "Error logging in" });
      }
    }
  );

  // Delete User - Protected route
  fastify.delete<{ Reply: FReply }>(
    "/auth/users/:userId",
    {
      preHandler: [authenticate, authorize("delete", "user")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };
        const user = (request as any).user;

        // Only allow users to delete their own account or admins to delete any account
        const isAdmin = user.roles.some((role: any) => role.name === "admin");

        if (!isAdmin && user._id.toString() !== userId) {
          return reply
            .status(403)
            .send({ message: "Unauthorized to delete this user" });
        }

        const deletedUser = await User.findByIdAndDelete(userId);
        if (!deletedUser) {
          return reply.status(404).send({ message: "User not found" });
        }

        reply.send({ message: "User deleted successfully" });
      } catch (error) {
        console.error("Error deleting user:", error);
        reply.status(500).send({ message: "Error deleting user" });
      }
    }
  );

  // Get user profile - Protected route
  fastify.get<{ Reply: FReply }>(
    "/auth/profile",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;

        // Don't send the password
        const userProfile = {
          _id: user._id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        };

        reply.send({
          message: "Profile retrieved successfully",
          user: userProfile,
        });
      } catch (error) {
        console.error("Error getting profile:", error);
        reply.status(500).send({ message: "Error retrieving profile" });
      }
    }
  );

  // Change password - Protected route
  fastify.put<{ Reply: FReply }>(
    "/auth/change-password",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { currentPassword, newPassword } = request.body as {
          currentPassword: string;
          newPassword: string;
        };

        const user = (request as any).user;

        // Validate current password
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
          return reply
            .status(401)
            .send({ message: "Current password is incorrect" });
        }

        // Validate new password
        if (!newPassword || newPassword.length < 8) {
          return reply.status(400).send({
            message: "New password must be at least 8 characters long",
          });
        }

        // Hash and update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findByIdAndUpdate(user._id, { password: hashedPassword });

        reply.send({ message: "Password changed successfully" });
      } catch (error) {
        console.error("Error changing password:", error);
        reply.status(500).send({ message: "Error changing password" });
      }
    }
  );
}

export default authRoutes;
