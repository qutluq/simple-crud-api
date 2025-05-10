import { v4 as uuidv4 } from "uuid";

import { User } from "../types";

export class InMemoryDatabase<T extends { id: string }> {
  private storage: Map<string, T>;

  constructor() {
    this.storage = new Map<string, T>();
  }

  async findAll(): Promise<T[]> {
    return Array.from(this.storage.values());
  }

  async findById(id: string): Promise<T | undefined> {
    return this.storage.get(id);
  }

  async create(data: Omit<T, "id">): Promise<T> {
    const id = uuidv4();
    const item = { ...data, id } as T;
    this.storage.set(id, item);
    return item;
  }

  async update(id: string, data: Partial<T>): Promise<T | undefined> {
    const existingItem = this.storage.get(id);

    if (!existingItem) {
      return undefined;
    }

    const updatedItem = { ...existingItem, ...data } as T;
    this.storage.set(id, updatedItem);

    return updatedItem;
  }

  async delete(id: string): Promise<boolean> {
    return this.storage.delete(id);
  }
}

export const usersDb = new InMemoryDatabase<User>();
