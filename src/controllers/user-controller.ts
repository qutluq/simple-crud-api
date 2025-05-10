import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { v4 as uuidv4 } from "uuid";

import { InMemoryDatabase } from "../db/inMemoryDb";
import { User } from "../types";

export const usersDb = new InMemoryDatabase<User>();

async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    const bodyParts: Uint8Array[] = [];
    req.on("data", (chunk: Uint8Array) => {
      bodyParts.push(chunk);
    });
    req.on("end", () => {
      const body = Buffer.concat(bodyParts).toString();
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any): void {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendNoContent(res: ServerResponse): void {
  res.writeHead(204);
  res.end();
}

/**
 * Route patterns:
 *
 * GET /users - getAllUsers
 *
 * GET /users/:id - getUserById
 *
 * POST /users - createUser
 *
 * PUT/PATCH /users/:id - updateUser
 *
 * DELETE /users/:id - deleteUser
 */
export async function handleUserRequests(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const method = req.method?.toUpperCase() || "";

    if (pathSegments[1] !== "users") {
      sendJson(res, 404, { message: "Not found" });
      return;
    }

    const id = pathSegments[2];

    if (method === "GET" && !id) {
      await UserController.getAllUsers(req, res);
    } else if (method === "GET" && id) {
      req.params = { id };
      await UserController.getUserById(req, res);
    } else if (method === "POST" && !id) {
      await UserController.createUser(req, res);
    } else if ((method === "PUT" || method === "PATCH") && id) {
      req.params = { id };
      await UserController.updateUser(req, res);
    } else if (method === "DELETE" && id) {
      req.params = { id };
      await UserController.deleteUser(req, res);
    } else {
      sendJson(res, 405, { message: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error handling request:", error);
    sendJson(res, 500, { message: "Internal server error" });
  }
}

export class UserController {
  static async getAllUsers(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const users = await usersDb.findAll();
      sendJson(res, 200, users);
    } catch (error) {
      console.error("Error getting all users:", error);
      sendJson(res, 500, { message: "Internal server error" });
    }
  }

  static async getUserById(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const id = req.params?.id;

      if (!id) {
        sendJson(res, 400, { message: "ID parameter is required" });
        return;
      }

      const user = await usersDb.findById(id);

      if (!user) {
        sendJson(res, 404, { message: "User not found" });
        return;
      }

      sendJson(res, 200, user);
    } catch (error) {
      console.error(`Error getting user with ID ${req.params?.id}:`, error);
      sendJson(res, 500, { message: "Internal server error" });
    }
  }

  static async createUser(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = await parseBody(req);
      const { name, email, age } = body;

      if (!name || !email) {
        sendJson(res, 400, { message: "Name and email are required" });
        return;
      }

      const now = new Date();
      const newUser = await usersDb.create({
        id: uuidv4(),
        name,
        email,
        age,
        createdAt: now,
        updatedAt: now,
      } as User);

      sendJson(res, 201, newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      sendJson(res, 500, { message: "Internal server error" });
    }
  }

  static async updateUser(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const id = req.params?.id;
      if (!id) {
        sendJson(res, 400, { message: "ID parameter is required" });
        return;
      }

      const body = await parseBody(req);
      const updateData = { ...body, updatedAt: new Date() };

      if (updateData.id) {
        delete updateData.id;
      }

      const updatedUser = await usersDb.update(id, updateData);

      if (!updatedUser) {
        sendJson(res, 404, { message: "User not found" });
        return;
      }

      sendJson(res, 200, updatedUser);
    } catch (error) {
      console.error(`Error updating user with ID ${req.params?.id}:`, error);
      sendJson(res, 500, { message: "Internal server error" });
    }
  }

  static async deleteUser(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const id = req.params?.id;
      if (!id) {
        sendJson(res, 400, { message: "ID parameter is required" });
        return;
      }

      const deleted = await usersDb.delete(id);

      if (!deleted) {
        sendJson(res, 404, { message: "User not found" });
        return;
      }

      sendNoContent(res);
    } catch (error) {
      console.error(`Error deleting user with ID ${req.params?.id}:`, error);
      sendJson(res, 500, { message: "Internal server error" });
    }
  }
}
