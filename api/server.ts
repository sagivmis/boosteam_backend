import fastify from "fastify";
import mongoose from "mongoose";
import authRoutes from "./routes/auth";
import cors from "@fastify/cors";

export const server = fastify({ logger: true });

const PORT = 3000;

// Enable CORS
server.register(cors, {
  origin: "*", // This will allow requests from any origin. You can replace '*' with your frontend's URL, e.g., 'http://localhost:3001'
  methods: ["GET", "POST", "PUT", "DELETE"],
});

// MongoDB connection
mongoose
  .connect(
    "mongodb+srv://admin:1234@dump.t7aoo.mongodb.net/boossteam?retryWrites=true&w=majority&appName=dump"
  )
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// Register routes
server.register(authRoutes);

// Start server
// server.listen({ port: PORT }, (err, address) => {
//   if (err) {
//     server.log.error(err);
//     process.exit(1);
//   }
//   console.log(`Server listening at ${address}`);
// });

// root
server.get("/", async (req, res) => {
  return res.status(200).send({ boosteam: "welcome" });
});

export default async function handler(req: any, reply: any) {
  try {
    await server.ready();
    console.log("Request Headers:", req.headers);
    server.server.emit("request", req, reply);
  } catch (err) {
    server.log.error(err);
    reply.status(504).send({ error: "An unexpected error occurred" });
  }
}
