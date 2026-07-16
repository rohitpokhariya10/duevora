import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

export async function connectTestDB() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
}

export async function disconnectTestDB() {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
}

export async function clearTestDB() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}

// Dummy test to satisfy Jest
describe("Test Database Helper", () => {
    it("should export helper functions", () => {
        expect(connectTestDB).toBeDefined();
        expect(disconnectTestDB).toBeDefined();
        expect(clearTestDB).toBeDefined();
    });
});

