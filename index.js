const express = require('express')
var cors = require('cors')
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 3000

app.use(cors({
  origin: [
    'http://localhost:5173', 'http://localhost:5174'
  ],
  credentials: true
}))
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dr6rgwa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log("Token in the middleware", token);
  if (!token) {
    return res.status(401).send({ message: "Unauthorized user" })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized user" })
    }
    req.user = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db("productInfoSystem");
    const productCollection = database.collection("productInfo");
    const recommendationCollection = database.collection("recommendation");


    ///jwt
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
      res.send({ success: true });
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      // console.log("Logging out");
      res.clearCookie('token', { maxAge: 0 }).send({ success: true })
    })

    app.post('/addProducts', async (req, res) => {
      const productsData = req.body;
      const result = await productCollection.insertOne(productsData);
      res.send(result);
    })

    app.get('/getRecent', async (req, res) => {
      const productsData = productCollection.find().sort({ dateTime: -1 }).limit(6);
      const result = await productsData.toArray();
      res.send(result);
    })

    app.get('/getRecentQueries', async (req, res) => {
      const productName = req.query.getRecentQueries;
      // console.log(productName);
      let cursor;
      if (productName && productName.trim() !== "") {
        const query = { productName: { $regex: productName, $options: 'i' } };
        cursor = productCollection.find(query);
      } else {
        cursor = productCollection.find();
      }
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/getData', verifyToken, async (req, res) => {
      const email = req.query.email
      // console.log("token Owner", req.user);
      if (req.user.email !== email) {
        res.status(403).send({ message: "Forbidden Access" })
      }
      const query = { email: email };
      const cursor = productCollection.find(query).sort({ dateTime: -1 });
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/myQueries/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    })

    app.put('/update/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: false };
      const updateData = req.body;
      // console.log(updateData);
      const eachData = {
        $set: {
          productName: updateData.productName,
          productBrand: updateData.productBrand,
          queryTitle: updateData.queryTitle,
          imgUrl: updateData.imgUrl,
          boycottReason: updateData.boycottReason,
        }
      }
      const result = await productCollection.updateOne(filter, eachData, options);
      res.send(result);
    })

    app.delete('/delete/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/queries', async (req, res) => {
      const cursor = productCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.put('/increaseCount/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const result = await productCollection.updateOne(
        filter,
        { $inc: { recommendationCount: 1 } }, // Increment recommendationCount by 1
        options
      );
      res.send(result);
    })

    app.put('/decrease/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const result = await productCollection.updateOne(
        filter,
        { $inc: { recommendationCount: -1 } }, // decrement recommendationCount by 1
        options
      );
      res.send(result);
    })


    ///recommendation collection part
    app.post('/addRecommendation', async (req, res) => {
      const recommendationData = req.body;
      // console.log(recommendationData)
      const result = await recommendationCollection.insertOne(recommendationData);
      res.send(result);
    })

    app.get(`/recommendatedDetail/:id`, async (req, res) => {
      const id = req.params.id
      const query = { queryId: id };
      const result = await recommendationCollection.find(query).toArray();
      res.send(result);
    })

    app.get(`/myRecommendations`, verifyToken, async (req, res) => {
      const email = req.query.email;
      // console.log("token Owner", req.user);
      if (req.user.email !== email) {
        res.status(403).send({ message: "Forbidden Access" })
      }
      const query = { recommendedEmail: email };
      const result = await recommendationCollection.find(query).toArray();
      res.send(result);
    })

    app.delete(`/deleteMyRecommendations/:id`, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await recommendationCollection.deleteOne(query);
      res.send(result);
    })

    app.get(`/getrecommendations/:email`, verifyToken, async (req, res) => {
      const email = req.params.email;
      // console.log("token Owner reco", req.user);
      if (req.user.email !== email) {
        res.status(403).send({ message: "Forbidden Access" })
      }
      const query = { userEmail: email };
      const result = await recommendationCollection.find(query).toArray();
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