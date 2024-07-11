const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://benevo-8b9b0.web.app",
      "https://benevo-8b9b0.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1gnzeig.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const logger = async (req, res, next) => {
  console.log("called:", req.hostname, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("value of token in the middleware", token);

  if (!token) {
    return res.status(401).send({ message: "unauthorized" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //err
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized" });
    }
    // valid token then decoded
    console.log("value in the token", decoded);
    req.user = decoded;
    next();
  });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();

    const volunteerCollection = client.db("charity").collection("volunteers");
    const volunteerRequestCollection = client
      .db("charity")
      .collection("requested");

    // auth related apis

    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1yr",
      });
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    // volunteer related apis

    app.get("/volunteers", logger, async (req, res) => {
      const query = {};
      const sort = { deadline_time: 1 };
      const cursor = volunteerCollection.find(query).sort(sort);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/volunteers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await volunteerCollection.findOne(query);
      res.send(result);
    });

    //jwt
    app.get("/volunteer", logger, verifyToken, async (req, res) => {
      console.log("valid token", req.user);
      if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await volunteerCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/volunteers", async (req, res) => {
      const volunteer = req.body;
      const result = await volunteerCollection.insertOne(volunteer);
      res.send(result);
    });

    app.put("/volunteers/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedVolunteerPost = req.body;
      const volunteerPost = {
        $set: {
          photo: updatedVolunteerPost.photo,
          category: updatedVolunteerPost.category,
          location: updatedVolunteerPost.location,
          post_title: updatedVolunteerPost.post_title,
          volunteers: updatedVolunteerPost.volunteers,
          description: updatedVolunteerPost.description,
          current_time: updatedVolunteerPost.current_time,
          deadline_time: updatedVolunteerPost.deadline_time,
        },
      };
      const result = await volunteerCollection.updateOne(
        filter,
        volunteerPost,
        options
      );
      res.send(result);
    });

    app.delete("/volunteers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await volunteerCollection.deleteOne(query);
      res.send(result);
    });

    // request apis

    //jwt
    app.get("/requested", logger, verifyToken, async (req, res) => {
      console.log("valid token", req.user);

      if (req.query.email !== req.user.volunteerEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};
      if (req.query?.volunteerEmail) {
        query = { volunteerEmail: req.query.volunteerEmail };
      }
      const result = await volunteerRequestCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/requested", async (req, res) => {
      const volunteerRequest = req.body;
      const result = await volunteerRequestCollection.insertOne(
        volunteerRequest
      );
      res.send(result);
    });

    app.delete("/requested/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await volunteerRequestCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    //await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Volunteer Management server is running");
});

app.listen(port, () => {
  console.log(`Volunteer Management Server is running on port: ${port}`);
});
