const express = require('express');
const cors = require('cors'); 
const { MongoClient } = require('mongodb'); 
require('dotenv').config();  

const app = express();
app.use(express.json());
app.use(cors());

const mongoURI = process.env.MONGO_URI;
console.log('URI:', mongoURI);

const client = new MongoClient(mongoURI);

client.connect()
    .then(() => {
        console.log('Conexión a MongoDB Atlas exitosa')
    })
    .catch(err => console.error('Error de conexión:', err));


const db = client.db('pwa'); 
const productsCollection = db.collection('products'); 
const salesCollection = db.collection('sales');

app.get('/api/items', async (req, res) => {
    const query = req.query.q;

    try {
        let products;

        if (!query) {
            products = await productsCollection.find().toArray();
        } else {
            products = await productsCollection.find({
                title: { $regex: query, $options: 'i' }  
            }).toArray();
        }

        res.status(200).json(products);
    } catch (error) {
        console.error("Error al obtener productos:", error);
        res.status(500).json({ message: "Error al obtener productos", error });
    }
});


app.get('/api/item/:id', async (req, res) => {
    const productId = parseInt(req.params.id, 10);

    try {
        const product = await productsCollection.findOne({ id: productId });

        if (!product) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        res.status(200).json(product);
    } catch (error) {
        console.error("Error al obtener el producto por ID:", error);
        res.status(500).json({ message: "Error al obtener el producto por ID", error });
    }
});

app.get('/api/sales', async (req, res) => {
    try {
        const sales = await salesCollection.find().sort({ date: -1 }).toArray();
        res.status(200).json(sales);
    } catch (error) {
        console.error("Error al obtener las ventas:", error);
        res.status(500).json({ message: "Error al obtener las ventas", error });
    }
});

app.post('/api/addSale', async (req, res) => {
    const { productId, quantity } = req.body;

    try {
        const product = await productsCollection.findOne({ id: productId });
        if (!product) {
            return res.status(404).json({ message: "Producto no encontrado", ok: false});
        }

        if (product.stock < quantity) {
            return res.status(400).json({ message: "Stock insuficiente", ok: false });
        }

        const total = product.price * quantity;

        const sale = {
            productId,
            name: product.title,
            quantity,
            date: new Date(),
            total, 
        };

        await salesCollection.insertOne(sale);

        await productsCollection.updateOne(
            { id: productId },
            { $inc: { stock: -quantity } }
        );

        res.status(201).json({ message: "Compra realizada con éxito", sale, ok: true });
    } catch (error) {
        console.error("Error al realizar la compra:", error);
        res.status(500).json({ message: "Error al realizar la compra", error, ok: false });
    }
});

const port = process.env.PORT || 5000; 
app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});