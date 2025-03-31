import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import User from "../models/User";
import { FReply, TeamPlayer } from "../utils";
import { authenticate, authorize } from "../middleware/auth";

async function teamRoutes(fastify: FastifyInstance) {
  // Get players and teams - Protected route
  fastify.get<{ Reply: FReply }>(
    "/teams",
    { preHandler: [authenticate, authorize("read", "team")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;

        // Extract players and teams from the user document
        const { players, teams, settings } = user;

        reply.send({
          message: "Successfully retrieved teams data",
          players,
          teams,
          settings,
        });
      } catch (error) {
        console.error("Error getting teams:", error);
        reply.status(500).send({ message: "Error retrieving teams data" });
      }
    }
  );

  // Save players and teams - Protected route
  fastify.post<{ Reply: FReply }>(
    "/teams",
    { preHandler: [authenticate, authorize("update", "team")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { players, teams, settings } = request.body as {
          players: TeamPlayer[];
          teams: Record<number, TeamPlayer[]>;
          settings: {
            maxPlayers: number;
            minDpsPlayers: number;
            minSupportPlayers: number;
          };
        };

        const user = (request as any).user;

        // Validate input
        if (!players || !Array.isArray(players)) {
          return reply.status(400).send({ message: "Invalid players data" });
        }

        if (!teams || typeof teams !== "object") {
          return reply.status(400).send({ message: "Invalid teams data" });
        }

        // Update user document
        await User.findByIdAndUpdate(user._id, {
          players,
          teams,
          settings,
        });

        reply.send({ message: "Teams data saved successfully" });
      } catch (error) {
        console.error("Error saving teams:", error);
        reply.status(500).send({ message: "Error saving teams data" });
      }
    }
  );

  // Add a new player - Protected route
  fastify.post<{ Reply: FReply }>(
    "/players",
    { preHandler: [authenticate, authorize("create", "player")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { name, role, tier } = request.body as {
          name: string;
          role: string;
          tier: string;
        };

        const user = (request as any).user;

        // Validate input
        if (!name || !role || !tier) {
          return reply.status(400).send({
            message: "Name, role, and tier are required",
          });
        }

        // Create new player
        const newPlayer = {
          name,
          role,
          tier,
          assignedTeamId: null,
        };

        // Update user's players array
        await User.findByIdAndUpdate(user._id, {
          $push: { players: newPlayer },
        });

        reply.status(201).send({
          message: "Player added successfully",
          player: newPlayer,
        });
      } catch (error) {
        console.error("Error adding player:", error);
        reply.status(500).send({ message: "Error adding player" });
      }
    }
  );

  // Delete a player - Protected route
  fastify.delete<{ Reply: FReply }>(
    "/players/:playerId",
    { preHandler: [authenticate, authorize("delete", "player")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { playerId } = request.params as { playerId: string };
        const user = (request as any).user;

        // Remove player from user's players array
        await User.findByIdAndUpdate(user._id, {
          $pull: { players: { _id: playerId } },
        });

        reply.send({ message: "Player deleted successfully" });
      } catch (error) {
        console.error("Error deleting player:", error);
        reply.status(500).send({ message: "Error deleting player" });
      }
    }
  );

  // Update a player - Protected route
  fastify.put<{ Reply: FReply }>(
    "/players/:playerId",
    { preHandler: [authenticate, authorize("update", "player")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { playerId } = request.params as { playerId: string };
        const { name, role, tier, assignedTeamId } = request.body as {
          name: string;
          role: string;
          tier: string;
          assignedTeamId?: number;
        };

        const user = (request as any).user;

        // Update player in user's players array
        await User.findOneAndUpdate(
          { _id: user._id, "players._id": playerId },
          {
            $set: {
              "players.$.name": name,
              "players.$.role": role,
              "players.$.tier": tier,
              "players.$.assignedTeamId": assignedTeamId,
            },
          }
        );

        reply.send({ message: "Player updated successfully" });
      } catch (error) {
        console.error("Error updating player:", error);
        reply.status(500).send({ message: "Error updating player" });
      }
    }
  );

  // Update user settings - Protected route
  fastify.put<{ Reply: FReply }>(
    "/settings",
    { preHandler: [authenticate, authorize("update", "settings")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { maxPlayers, minDpsPlayers, minSupportPlayers } =
          request.body as {
            maxPlayers: number;
            minDpsPlayers: number;
            minSupportPlayers: number;
          };

        const user = (request as any).user;

        // Validate input
        if (maxPlayers < 1 || minDpsPlayers < 0 || minSupportPlayers < 0) {
          return reply.status(400).send({ message: "Invalid settings values" });
        }

        // Update user settings
        await User.findByIdAndUpdate(user._id, {
          settings: {
            maxPlayers,
            minDpsPlayers,
            minSupportPlayers,
          },
        });

        reply.send({ message: "Settings updated successfully" });
      } catch (error) {
        console.error("Error updating settings:", error);
        reply.status(500).send({ message: "Error updating settings" });
      }
    }
  );
}

export default teamRoutes;
