```ts
import mongoose from "mongoose";
import {
    cachedQuery,
    closeDefaultAdapter,
    expressRequestCache,
} from "req-query-cache";
import express from "express";
import { MongoMemoryServer } from "mongodb-memory-server";

mongoose.set('debug', true);

async function main() {
    const mongod = await MongoMemoryServer.create();

    const uri = mongod.getUri();
    console.log("[MongoMemoryServer] URI:", uri);

    await mongoose.connect(uri, { dbName: "test" });
    console.log("[Mongoose] Connected to in-memory MongoDB");

    const UserSchema = new mongoose.Schema({ name: String });
    const User = mongoose.model("User", UserSchema);

    // Insert some dummy if empty
    if ((await User.countDocuments().exec()) === 0) {
        await User.create([
            { name: "Alice", email: "alice@example.com" },
            { name: "Bob", email: "bob@example.com" },
        ]);
    }
    console.log("[Mongoose] Inserted 2 users");

    const app = express();
    app.use(express.json());
    app.use(expressRequestCache());

    app.get("/users", async (req, res) => {
        const first = await cachedQuery({
            key: "allUsers",
            queryFn: () => User.find().lean().exec(),
            ttlMs: 5000,
        });
        const second = await cachedQuery({
            key: "allUsers",
            queryFn: () => {
                console.warn("[Should NOT see this warning]");
                return User.find().lean().exec();
            },
            ttlMs: 10000,
        });
        res.json({ first, second });
    });

    app.listen(4000, () => {
        console.log(`[Express] Listening on http://localhost:4000`);
        console.log("→ Try: curl http://localhost:4000/users");
    });

    process.on("SIGINT", async () => {
        console.log("\n[Shutdown] SIGINT received, closing…");
        await mongoose.disconnect();
        await mongod.stop();
        closeDefaultAdapter();
        process.exit(0);
    });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
```