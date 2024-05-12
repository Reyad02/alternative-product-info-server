const express = require('express')
var cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT||3000

app.use(cors())
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dr6rgwa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db("productInfoSystem");
    const productCollection = database.collection("productInfo");


    app.post('/addProducts', async(req, res) => {
      const productsData = req.body;
      const result = await productCollection.insertOne(productsData);
      res.send(result);
    })

    app.get('/getRecent', async(req, res) => {
      const productsData = productCollection.find().sort({dateTime: -1}).limit(6);
      const result = await productsData.toArray();
      res.send(result);
    })

    app.get('/getData', async(req, res) => {
      const email = req.query.email
      const query = {email: email};
      const cursor = productCollection.find(query).sort({ dateTime: -1 });
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/myQueries/:id', async(req, res) => {
      const id = req.params.id
      const query = {_id: new ObjectId(id)};
      const result = await productCollection.findOne(query);
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})