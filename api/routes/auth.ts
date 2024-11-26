import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import User, { IUser } from "../../src/models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { FReply, ErrorReply, type TeamPlayer } from "../../src/util";

const SECRET_KEY = "your_secret_key";

async function authRoutes(fastify: FastifyInstance) {
  // Register User
  fastify.post<{ Reply: FReply }>(
    "/register",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { username, password } = request.body as {
        username: string;
        password: string;
      };

      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });

        await user.save();
        reply.send({ message: "User registered successfully" });
      } catch (error: any) {
        console.log("Error registering user:", error);
        if (
          error.code === 11000 &&
          error.keyPattern &&
          error.keyPattern.username
        ) {
          reply
            .status(409)
            .send({ message: "User with the same email already exists" });
        }
        reply
          .status(500)
          .send({ message: "Error registering user", details: error.message });
      }
    }
  );

  // Login User
  fastify.post<{ Reply: FReply }>(
    "/login",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { username, password } = request.body as {
        username: string;
        password: string;
      };

      try {
        const user = await User.findOne({ username });
        if (!user) {
          return reply
            .status(401)
            .send({ message: "Invalid username or password" });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return reply.status(401).send({ message: "Incorrect password" });
        }

        const token = jwt.sign({ userId: user._id }, SECRET_KEY, {
          expiresIn: "1h",
        });
        reply.send({ message: "Logged in successfully.", token, user });
      } catch (error) {
        reply.status(500).send({ message: "Error logging in" });
      }
    }
  );

  // Delete User
  fastify.delete<{ Reply: FReply }>(
    "/delete-user/:userId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
          return reply.status(401).send({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, SECRET_KEY) as { userId: string };

        const { userId } = request.params as { userId: string };
        if (decoded.userId !== userId) {
          return reply
            .status(403)
            .send({ message: "Unauthorized to delete this user" });
        }

        const user = await User.findByIdAndDelete(userId);
        if (!user) {
          return reply.status(404).send({ message: "User not found" });
        }

        reply.send({ message: "User deleted successfully" });
      } catch (error) {
        reply.status(500).send({ message: "Error deleting user" });
      }
    }
  );

  // Save Progress
  fastify.post<{ Reply: FReply }>(
    "/save-progress",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
          return reply.status(401).send({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, SECRET_KEY) as { userId: string };

        const { players, teams, settings } = request.body as {
          players: TeamPlayer[];
          teams: Record<number, TeamPlayer[]>;
          settings: {
            maxPlayers: number;
            minDpsPlayers: number;
            minSupportPlayers: number;
          };
        };

        await User.findByIdAndUpdate(decoded.userId, {
          players,
          teams,
          settings,
        });

        reply.send({ message: "Progress saved successfully" });
      } catch (error) {
        console.error("Error saving progress:", error);
        reply.status(500).send({ message: "Error saving progress" });
      }
    }
  );

  // Load Progress
  fastify.get<{ Reply: FReply }>(
    "/load-progress",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
          return reply.status(401).send({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, SECRET_KEY) as { userId: string };

        const user = await User.findById(decoded.userId);
        if (!user) {
          return reply.status(404).send({ message: "User not found" });
        }

        // Extract players, teams, and settings from the user document
        const { players, teams, settings } = user;

        reply.send({
          message: "Successfully loaded progress",
          players,
          teams,
          settings,
        });
      } catch (error) {
        console.error("Error loading progress:", error);
        reply.status(500).send({ message: "Error loading progress" });
      }
    }
  );
}

export default authRoutes;
