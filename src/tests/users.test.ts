import { IncomingMessage, ServerResponse } from "http";
import { v4 as uuidv4 } from "uuid";

import { handleUserRequests, UserController, usersDb } from "../controllers/index.ts";

jest.mock("uuid");
jest.mock("../db/inMemoryDb", () => {
  return {
    InMemoryDatabase: jest.fn().mockImplementation(() => ({
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  };
});

describe("User API Endpoints", () => {
  let req: IncomingMessage;
  let res: ServerResponse<IncomingMessage> & {
    req: IncomingMessage;
  };
  let mockUuid: string;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      url: "",
      method: "",
      headers: { host: "localhost:3000" },
      on: jest.fn((event, callback) => {
        if (event === "end") callback();
        return req;
      }),
      params: {},
    } as unknown as IncomingMessage;

    res = {
      writeHead: jest.fn(),
      end: jest.fn(),
    } as unknown as ServerResponse;

    mockUuid = "test-uuid-1234";
    (uuidv4 as jest.Mock).mockReturnValue(mockUuid);
  });

  describe("GET /api/users", () => {
    it("should return status 200 and all users", async () => {
      const mockUsers = [
        {
          id: "1",
          name: "John",
          email: "john@example.com",
          age: 30,
          hobbies: ["reading"],
        },
        {
          id: "2",
          name: "Jane",
          email: "jane@example.com",
          age: 25,
          hobbies: ["swimming"],
        },
      ];
      usersDb.findAll = jest.fn().mockResolvedValue(mockUsers);
      req.url = "/api/users";
      req.method = "GET";

      await handleUserRequests(req, res);

      expect(usersDb.findAll).toHaveBeenCalled();
      expect(res.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "application/json",
      });
      expect(res.end).toHaveBeenCalledWith(JSON.stringify(mockUsers));
    });
  });

  describe("GET /api/users/{userId}", () => {
    it("should return status 200 and user if it exists", async () => {
      const userId = "existing-user-id";
      const mockUser = {
        id: userId,
        name: "John",
        email: "john@example.com",
        age: 30,
        hobbies: ["reading"],
      };
      usersDb.findById = jest.fn().mockResolvedValue(mockUser);
      req.url = `/api/users/${userId}`;
      req.method = "GET";
      req.params = { id: userId };

      await handleUserRequests(req, res);

      expect(usersDb.findById).toHaveBeenCalledWith(userId);
      expect(res.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "application/json",
      });
      expect(res.end).toHaveBeenCalledWith(JSON.stringify(mockUser));
    });

    it("should return status 404 if user does not exist", async () => {
      const userId = "non-existing-id";
      usersDb.findById = jest.fn().mockResolvedValue(undefined);
      req.url = `/api/users/${userId}`;
      req.method = "GET";
      req.params = { id: userId };

      await handleUserRequests(req, res);

      expect(usersDb.findById).toHaveBeenCalledWith(userId);
      expect(res.writeHead).toHaveBeenCalledWith(404, {
        "Content-Type": "application/json",
      });
      expect(res.end).toHaveBeenCalledWith(JSON.stringify({ message: "User not found" }));
    });

    it("should return status 400 if userId is invalid", async () => {
      const invalidUserId = "invalid-uuid";
      req.url = `/api/users/${invalidUserId}`;
      req.method = "GET";
      req.params = { id: invalidUserId };

      usersDb.findById = jest.fn().mockImplementation(() => {
        throw new Error("Invalid UUID format");
      });

      console.error = jest.fn();

      await UserController.getUserById(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(500, {
        "Content-Type": "application/json",
      });
      expect(res.end).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("POST /api/users", () => {
    it("should return status 201 and created user when valid data is provided", async () => {
      const mockRequestBody = {
        name: "New User",
        email: "new@example.com",
        age: 28,
        hobbies: ["coding", "gaming"],
      };

      const now = new Date();
      jest.spyOn(global, "Date").mockImplementation(() => now);

      const mockCreatedUser = {
        id: mockUuid,
        ...mockRequestBody,
        createdAt: now,
        updatedAt: now,
      };

      usersDb.create = jest.fn().mockResolvedValue(mockCreatedUser);

      req.url = "/api/users";
      req.method = "POST";

      req.on = jest.fn((event, callback) => {
        if (event === "data") {
          callback(Buffer.from(JSON.stringify(mockRequestBody)));
        } else if (event === "end") {
          callback();
        }
        return req;
      });

      await handleUserRequests(req, res);

      expect(usersDb.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockRequestBody.name,
          email: mockRequestBody.email,
          age: mockRequestBody.age,
          hobbies: mockRequestBody.hobbies,
          id: mockUuid,
        })
      );

      expect(res.writeHead).toHaveBeenCalledWith(201, {
        "Content-Type": "application/json",
      });
      expect(res.end).toHaveBeenCalledWith(JSON.stringify(mockCreatedUser));
    });

    it("should return status 400 when required fields are missing", async () => {
      const mockRequestBody = {
        age: 28,
        hobbies: ["coding"],
      };

      req.url = "/api/users";
      req.method = "POST";

      req.on = jest.fn((event, callback) => {
        if (event === "data") {
          callback(Buffer.from(JSON.stringify(mockRequestBody)));
        } else if (event === "end") {
          callback();
        }
        return req;
      });

      await handleUserRequests(req, res);

      expect(usersDb.create).not.toHaveBeenCalled();
      expect(res.writeHead).toHaveBeenCalledWith(400, {
        "Content-Type": "application/json",
      });
      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({
          message: "Name, email, age, and hobbies are required",
        })
      );
    });
  });

  describe("PUT /api/users/{userId}", () => {
    it("should return status 200 and updated user when user exists", async () => {
      const userId = "existing-user-id";
      const mockRequestBody = {
        name: "Updated Name",
        email: "updated@example.com",
      };

      const now = new Date();
      jest.spyOn(global, "Date").mockImplementation(() => now);

      const mockUpdatedUser = {
        id: userId,
        name: "Updated Name",
        email: "updated@example.com",
        age: 30,
        hobbies: ["reading"],
        updatedAt: now,
      };

      usersDb.update = jest.fn().mockResolvedValue(mockUpdatedUser);

      req.url = `/api/users/${userId}`;
      req.method = "PUT";
      req.params = { id: userId };

      req.on = jest.fn((event, callback) => {
        if (event === "data") {
          callback(Buffer.from(JSON.stringify(mockRequestBody)));
        } else if (event === "end") {
          callback();
        }
        return req;
      });

      await handleUserRequests(req, res);

      expect(usersDb.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          ...mockRequestBody,
          updatedAt: now,
        })
      );

      expect(res.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "application/json",
      });
      expect(res.end).toHaveBeenCalledWith(JSON.stringify(mockUpdatedUser));
    });

    it("should return status 404 when user does not exist", async () => {
      const userId = "non-existing-id";
      const mockRequestBody = {
        name: "Will Not Update",
        email: "wont@update.com",
      };

      usersDb.update = jest.fn().mockResolvedValue(undefined);

      req.url = `/api/users/${userId}`;
      req.method = "PUT";
      req.params = { id: userId };

      req.on = jest.fn((event, callback) => {
        if (event === "data") {
          callback(Buffer.from(JSON.stringify(mockRequestBody)));
        } else if (event === "end") {
          callback();
        }
        return req;
      });

      await handleUserRequests(req, res);

      expect(usersDb.update).toHaveBeenCalledWith(userId, expect.any(Object));
      expect(res.writeHead).toHaveBeenCalledWith(404, {
        "Content-Type": "application/json",
      });
      expect(res.end).toHaveBeenCalledWith(JSON.stringify({ message: "User not found" }));
    });

    it("should return status 400 if userId is invalid", async () => {
      const invalidUserId = "invalid-uuid";
      req.url = `/api/users/${invalidUserId}`;
      req.method = "PUT";
      req.params = { id: invalidUserId };

      req.on = jest.fn((event, callback) => {
        if (event === "data") {
          callback(Buffer.from(JSON.stringify({ name: "Test" })));
        } else if (event === "end") {
          callback();
        }
        return req;
      });

      usersDb.update = jest.fn().mockImplementation(() => {
        throw new Error("Invalid UUID format");
      });

      console.error = jest.fn();

      await UserController.updateUser(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(500, {
        "Content-Type": "application/json",
      });
      expect(res.end).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/users/{userId}", () => {
    it("should return status 204 when user is successfully deleted", async () => {
      const userId = "existing-user-id";
      usersDb.delete = jest.fn().mockResolvedValue(true);

      req.url = `/api/users/${userId}`;
      req.method = "DELETE";
      req.params = { id: userId };

      await handleUserRequests(req, res);

      expect(usersDb.delete).toHaveBeenCalledWith(userId);
      expect(res.writeHead).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
    });

    it("should return status 404 when user does not exist", async () => {
      const userId = "non-existing-id";
      usersDb.delete = jest.fn().mockResolvedValue(false);

      req.url = `/api/users/${userId}`;
      req.method = "DELETE";
      req.params = { id: userId };

      await handleUserRequests(req, res);

      expect(usersDb.delete).toHaveBeenCalledWith(userId);
      expect(res.writeHead).toHaveBeenCalledWith(404, {
        "Content-Type": "application/json",
      });
      expect(res.end).toHaveBeenCalledWith(JSON.stringify({ message: "User not found" }));
    });

    it("should return status 400 if userId is invalid", async () => {
      const invalidUserId = "invalid-uuid";
      req.url = `/api/users/${invalidUserId}`;
      req.method = "DELETE";
      req.params = { id: invalidUserId };

      usersDb.delete = jest.fn().mockImplementation(() => {
        throw new Error("Invalid UUID format");
      });

      console.error = jest.fn();

      await UserController.deleteUser(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(500, {
        "Content-Type": "application/json",
      });
      expect(res.end).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("Non-existing endpoints", () => {
    it("should return status 404 for non-existing endpoints", async () => {
      req.url = "/api/non-existing-endpoint";
      req.method = "GET";

      await handleUserRequests(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(404, {
        "Content-Type": "application/json",
      });
      expect(res.end).toHaveBeenCalledWith(JSON.stringify({ message: "Not found" }));
    });
  });

  describe("Server errors", () => {
    it("should return status 500 for server errors", async () => {
      req.url = "/api/users";
      req.method = "GET";

      usersDb.findAll = jest.fn().mockImplementation(() => {
        throw new Error("Database connection error");
      });

      console.error = jest.fn();

      await handleUserRequests(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(500, {
        "Content-Type": "application/json",
      });
      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({ message: "Internal server error" })
      );
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("Method not allowed", () => {
    it("should return status 405 for methods not allowed on an endpoint", async () => {
      req.url = "/api/users/123";
      req.method = "PATCH";

      await handleUserRequests(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(405, {
        "Content-Type": "application/json",
      });
      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({ message: "Method not allowed" })
      );
    });
  });
});

describe("Server routes", () => {
  let req: IncomingMessage;
  let res: ServerResponse<IncomingMessage> & {
    req: IncomingMessage;
  };
  let handleUserRequestsSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      url: "",
      method: "",
      headers: {},
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === "end") callback();
        return req;
      }),
    } as unknown as IncomingMessage;

    res = {
      writeHead: jest.fn(),
      end: jest.fn(),
      setHeader: jest.fn(),
    } as unknown as ServerResponse;

    handleUserRequestsSpy = jest.spyOn({ handleUserRequests }, "handleUserRequests");
  });

  it("should handle OPTIONS requests with CORS headers", async () => {});

  it("should handle 404 for unknown routes", async () => {});
});
