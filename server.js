// server.js
import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import axios from "axios";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";
import https from "https";
import { Credentials, Translator } from "@translated/lara";

// Load environment variables from .env file
dotenv.config();

// Initialize express app
const app = express();

// Use the PORT provided by Railway or default to 3000
const port = process.env.PORT || 3000;

// File path helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the 'public' folder
// This makes everything in 'public' directly accessible via the browser
app.use(express.static(path.join(__dirname, "public")));

// If you have an "uploads" folder inside 'public', you don't need a separate static,
// but if you store uploads outside 'public', then you do:
app.use("/uploads", express.static("uploads"));

// Configure body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ---------------------------------------------------
// 1) PostgreSQL Connection
// ---------------------------------------------------
// Option A: Using single DATABASE_URL (recommended on Railway)
const { Client } = pg;
const db = new Client({
  connectionString: process.env.DATABASE_URL,
  // If you're on Railway, often you need SSL set like below:
  ssl: {
    rejectUnauthorized: false,
  },
});

// Option B: If you insist on separate variables, remove "localhost"
// and use the actual host from Railway. Example:
// const db = new Client({
//   user: process.env.USER_NAME,
//   host: process.env.DB_HOST, // e.g. "containers-us-west-XX.railway.app"
//   database: process.env.DATABASE_NAME,
//   password: process.env.DATABASE_PASSWORD,
//   port: process.env.DB_PORT, // e.g. 5432
//   ssl: { rejectUnauthorized: false },
// });

db.connect((err) => {
  if (err) {
    console.error("Error connecting to PostgreSQL:", err);
  } else {
    console.log("Connected to PostgreSQL");
  }
});

// ---------------------------------------------------
// 2) ROUTES
// ---------------------------------------------------

// ----------------- SIGNUP / LOGIN (Farmer) -----------------
app.post("/signup", async (req, res) => {
  try {
    const { username, phone, password } = req.body;
    if (!username || !phone || !password) {
      return res.send(
        `<script>alert("All fields are required."); window.location.href='/signup';</script>`
      );
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.send(
        `<script>alert("Phone number must be exactly 10 digits."); window.location.href='/signup';</script>`
      );
    }
    if (password.length < 6) {
      return res.send(
        `<script>alert("Password must be more than 6 characters."); window.location.href='/signup';</script>`
      );
    }
    const existingUser = await db.query(
      "SELECT * FROM signup WHERE phone_no = $1",
      [phone]
    );
    if (existingUser.rows.length > 0) {
      return res.send(
        `<script>alert("Account already exists."); window.location.href='/signup';</script>`
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery = `
      INSERT INTO signup (username, phone_no, password)
      VALUES ($1, $2, $3);
    `;
    await db.query(insertQuery, [username, phone, hashedPassword]);

    // Use path.join to serve the file
    res.sendFile(path.join(__dirname, "public", "pages", "homepage.html"));
  } catch (err) {
    console.error("Signup Error:", err);
    res.send(
      `<script>alert("Something went wrong. Please try again."); window.location.href='/signup';</script>`
    );
  }
});

app.post("/login", async (req, res) => {
  const { phone, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM signup WHERE phone_no = $1", [
      phone,
    ]);
    if (result.rows.length === 0) {
      return res.send(`
        <script>
          alert('Account not found');
          window.location.href="/login";
        </script>
      `);
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      return res.redirect("/home");
    } else {
      return res.send(`
        <script>
          alert('Wrong password');
          window.location.href="/login";
        </script>
      `);
    }
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).send("Server error, please try again.");
  }
});

// ----------------- SIGNUP / LOGIN (Customer) -----------------
app.post("/signupcus", async (req, res) => {
  try {
    const { username, phone, password } = req.body;
    if (!username || !phone || !password) {
      return res.send(
        `<script>alert("All fields are required."); window.location.href='/signupcus';</script>`
      );
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.send(
        `<script>alert("Phone number must be exactly 10 digits."); window.location.href='/signupcus';</script>`
      );
    }
    if (password.length < 6) {
      return res.send(
        `<script>alert("Password must be more than 6 characters."); window.location.href='/signupcus';</script>`
      );
    }
    const existingUser = await db.query(
      "SELECT * FROM cus_signup WHERE phone_no = $1",
      [phone]
    );
    if (existingUser.rows.length > 0) {
      return res.send(
        `<script>alert("Account already exists."); window.location.href='/signupcus';</script>`
      );
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery = `
      INSERT INTO cus_signup (username, phone_no, password)
      VALUES ($1, $2, $3);
    `;
    await db.query(insertQuery, [username, phone, hashedPassword]);

    res.sendFile(path.join(__dirname, "public", "pages", "homepage_cus.html"));
  } catch (err) {
    console.error("Signup Error:", err);
    res.send(
      `<script>alert("Something went wrong. Please try again."); window.location.href='/signupcus';</script>`
    );
  }
});

app.post("/logincus", async (req, res) => {
  const { phone, password } = req.body;
  try {
    const result = await db.query(
      "SELECT * FROM cus_signup WHERE phone_no = $1",
      [phone]
    );
    if (result.rows.length === 0) {
      return res.send(`
        <script>
          alert('Account not found');
          window.location.href="/logincus";
        </script>
      `);
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      return res.redirect("/homecus");
    } else {
      return res.send(`
        <script>
          alert('Wrong password');
          window.location.href="/logincus";
        </script>
      `);
    }
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).send("Server error, please try again.");
  }
});

// ---------------------------------------------------
// 3) FILE UPLOADS / PRODUCT LISTINGS
// ---------------------------------------------------
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Insert product data
app.post("/api/products", upload.single("productImage"), async (req, res) => {
  const {
    productName,
    productPrice,
    productQuantity,
    productQuality,
    productDescription,
    contactNumber,
    priceCurrency,
    quantityUnit,
  } = req.body;
  const imagePath = req.file ? "/uploads/" + req.file.filename : "";

  try {
    const parsedPrice = parseFloat(productPrice);
    const parsedQuantity = parseFloat(productQuantity);

    const maxAllowedQuantity = 2000;
    const maxAllowedPrice = 20000;

    if (parsedQuantity > maxAllowedQuantity) {
      return res.send(
        `<script>alert("Max allowed quantity: ${maxAllowedQuantity}"); window.location.href='/sell';</script>`
      );
    } else if (parsedPrice > maxAllowedPrice) {
      return res.send(
        `<script>alert("Max allowed price: ₹${maxAllowedPrice}"); window.location.href='/sell';</script>`
      );
    } else {
      const insertQuery = `
        INSERT INTO products
          (product_name, price, quantity, quality, description, contact_number, image, currency, quantity_unit)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
      `;
      const values = [
        productName,
        parsedPrice,
        parsedQuantity,
        productQuality,
        productDescription,
        contactNumber,
        imagePath,
        priceCurrency,
        quantityUnit,
      ];
      await db.query(insertQuery, values);
      res.redirect("/pages/farmer-market.html");
    }
  } catch (error) {
    console.error("Error inserting product:", error);
    res.status(500).send("Server error");
  }
});

// Fetch all products
app.get("/api/products", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM products ORDER BY id DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Server error");
  }
});

// ---------------------------------------------------
// 4) SYMPTOM PREDICTION / GEMINI AI
// ---------------------------------------------------
app.post("/upload", upload.single("imageInput"), async (req, res) => {
  try {
    const { description, language } = req.body;
    const filePath = req.file.path;
    const query =
      "INSERT INTO predictions (image_path, description, language) VALUES ($1, $2, $3) RETURNING id";
    const values = [filePath, description, language];
    const result = await db.query(query, values);
    res.json({ success: true, predictionId: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/analyze", async (req, res) => {
  try {
    const { predictionId } = req.body;
    const dbResult = await db.query("SELECT * FROM predictions WHERE id = $1", [
      predictionId,
    ]);
    if (dbResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Prediction not found" });
    }
    const record = dbResult.rows[0];
    const imageUrl =
      "https://1.bp.blogspot.com/-fr7iwyvZ5t8/Xp082pHa5pI/AAAAAAAABBw/DSrN-yg9Lz4K3OjMzYD5gc_GHurIHvcRgCLcBGAsYHQ/s1600/Leaf%2Bspot%2Bdisease.jpg";

    let prompt;
    if (imageUrl.includes("localhost")) {
      prompt = `
I cannot access local files like the image provided (${imageUrl}). 
[...explanatory fallback prompt...]
Based on your description "${record.description}", here is some general advice:
[...further instructions...]
      `;
    } else {
      prompt = `
Analyze the following image and description:
Image URL: ${imageUrl}
Description: ${record.description}
Provide:
- The best homemade remedy
- Why this issue occurs
- A detailed explanation in ${record.language.trim()}
Format your answer clearly and concisely.
      `;
    }

    const GEMINI_MODEL = "models/gemini-1.5-pro-002";
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const httpsAgent = new https.Agent({ keepAlive: true });

    const response = await axios.post(
      geminiApiUrl,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
        httpsAgent,
      }
    );

    const geminiResponse = response.data;
    console.log("Gemini AI Full Response:", geminiResponse);

    if (!geminiResponse.candidates || geminiResponse.candidates.length === 0) {
      throw new Error("No response from Gemini AI.");
    }
    const responseText =
      geminiResponse.candidates[0]?.content?.parts[0]?.text ||
      "No valid response.";

    await db.query("UPDATE predictions SET gemini_details = $1 WHERE id = $2", [
      responseText,
      predictionId,
    ]);

    res.json({ success: true, data: { details: responseText } });
  } catch (error) {
    console.error("Error in /analyze:", error.message);
    if (error.response) {
      console.error("Response Data:", error.response.data);
      console.error("Response Status:", error.response.status);
    } else if (error.request) {
      console.error("No response received. Request:", error.request);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/prediction/:id", async (req, res) => {
  try {
    const query = "SELECT * FROM predictions WHERE id = $1";
    const values = [req.params.id];
    const result = await db.query(query, values);
    if (result.rows.length > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.status(404).json({ success: false, error: "Prediction not found" });
    }
  } catch (error) {
    console.error("Error in GET /prediction:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------
// 5) PAGE ROUTES (Serving HTML Files)
// ---------------------------------------------------
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "login.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "signUp.html"));
});

app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "homepage.html"));
});

app.get("/homecus", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "homepage_cus.html"));
});

app.get("/health", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "health.html"));
});

app.get("/sell", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "selling.html"));
});

app.get("/market", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "farmer-market.html"));
});

app.get("/marketcus", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "pages", "farmer-market_cus.html")
  );
});

app.get("/whichusers", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "whichusers.html"));
});

app.get("/signupcus", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "signupcus.html"));
});

app.get("/logincus", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "logincus.html"));
});

app.get("/predict", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "prediction.html"));
});

app.get("/upload", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "symptom.html"));
});

// Default route: serve the index page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "index.html"));
});

// ---------------------------------------------------
// 6) START THE SERVER
// ---------------------------------------------------
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
