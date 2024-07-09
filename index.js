const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// volunteerMaster
// BeXgPNb4frMGFqGF

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1gnzeig.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const volunteerCollection = client.db("charity").collection("volunteers");

    app.get("/volunteers", async (req, res) => {
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

    app.get("/volunteer", async (req, res) => {
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

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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
