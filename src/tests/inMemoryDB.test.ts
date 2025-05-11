import { User } from "src/types";
import { v4 as uuidv4 } from "uuid";

import { InMemoryDatabase } from "../db/inMemoryDb";

jest.mock("uuid");

describe("InMemoryDatabase", () => {
  let db: InMemoryDatabase<User>;
  let mockUuid: string;

  beforeEach(() => {
    db = new InMemoryDatabase();

    mockUuid = "test-uuid-1234";
    (uuidv4 as jest.Mock).mockReturnValue(mockUuid);
  });

  describe("findAll", () => {
    it("should return an empty array for an empty database", async () => {
      const result = await db.findAll();

      expect(result).toEqual([]);
    });

    it("should return all stored items", async () => {
      const items = [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ];

      (db as any).storage = new Map(items.map((item) => [item.id, item]));

      const result = await db.findAll();

      expect(result).toEqual(expect.arrayContaining(items));
      expect(result.length).toBe(items.length);
    });
  });

  describe("findById", () => {
    it("should return undefined for non-existing item", async () => {
      const result = await db.findById("non-existing-id");

      expect(result).toBeUndefined();
    });

    it("should return the item if it exists", async () => {
      const item = { id: "1", name: "Test Item" };
      (db as any).storage.set(item.id, item);

      const result = await db.findById(item.id);

      expect(result).toEqual(item);
    });
  });

  describe("create", () => {
    it("should create an item with generated UUID", async () => {
      const itemData: Omit<User, "id"> = {
        name: "New Item",
        email: "",
        age: 21,
        hobbies: [],
      };

      const result = await db.create(itemData);

      expect(result).toEqual({
        id: mockUuid,
        name: "New Item",
        email: "",
        age: 21,
        hobbies: [],
      });

      expect(await db.findById(mockUuid)).toEqual(result);
    });
  });

  describe("update", () => {
    it("should return undefined when trying to update non-existing item", async () => {
      const result = await db.update("non-existing-id", { name: "Updated Name" });

      expect(result).toBeUndefined();
    });

    it("should update existing item and return updated version", async () => {
      const item = { id: "1", name: "Original Name", age: 30 };
      (db as any).storage.set(item.id, item);

      const updateData = { name: "Updated Name" };

      const result = await db.update(item.id, updateData);

      expect(result).toEqual({
        id: "1",
        name: "Updated Name",
        age: 30,
      });

      expect(await db.findById(item.id)).toEqual(result);
    });
  });

  describe("delete", () => {
    it("should return false when trying to delete non-existing item", async () => {
      const result = await db.delete("non-existing-id");

      expect(result).toBe(false);
    });

    it("should delete existing item and return true", async () => {
      const item = { id: "1", name: "Item to Delete" };
      (db as any).storage.set(item.id, item);

      expect(await db.findById(item.id)).toEqual(item);

      const result = await db.delete(item.id);

      expect(result).toBe(true);

      expect(await db.findById(item.id)).toBeUndefined();
    });
  });
});
