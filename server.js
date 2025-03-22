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

dotenv.config();

const app = express();
const port = 3000;

//files tracing
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//public static files
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "Agriconnect/public")));
app.use("/uploads", express.static("uploads"));

//body parser middle ware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Postgres connection
const db = new pg.Client({
  user: process.env.USER_NAME,
  host: "localhost",
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: 5432,
});

db.connect((err) => {
  if (err) {
    console.log("error connecting to postgreSQL");
  } else {
    console.log("connected to postgreSQL");
  }
});

app.post("/signup", async (req, res) => {
  try {
    const { username, phone, password } = req.body;
    // Check if all fields are filled
    if (!username || !phone || !password) {
      return res.send(
        `<script>alert("All fields are required."); window.location.href='/signup';</script>`
      );
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.send(
        `<script>alert("Phone number must be exactly 10 digits and contain only numbers."); window.location.href='/signup';</script>`
      );
    }
    // Check if password is at least 6 characters long
    if (password.length < 6) {
      return res.send(
        `<script>alert("Password must be more than 6 characters."); window.location.href='/signup';</script>`
      );
    }
    // Check if an account already exists with the given email or phone number
    const existingUser = await db.query(
      "SELECT * FROM signup WHERE phone_no = $1",
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.send(
        `<script>alert("Account already exists."); window.location.href='/signup';</script>`
      );
    }

    // Hash the password before storing in the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into the database
    const insertQuery = `
      INSERT INTO signup (username, phone_no, password)
      VALUES ($1, $2, $3);
    `;
    await db.query(insertQuery, [username, phone, hashedPassword]);

    // Redirect user to home page after successful signup
    res.sendFile("/Agriconnect/public/pages/homepage.html");
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
    // Check if the account exists
    const result = await db.query("SELECT * FROM signup WHERE phone_no = $1", [
      phone,
    ]);

    if (result.rows.length === 0) {
      // Account not found
      return res.send(`
        <script>
          alert('Account not found');
          window.location.href="/login";
        </script>
      `);
    }

    const user = result.rows[0];

    // Compare hashed password with entered password
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      return res.redirect("/home");
    } else if (!isMatch) {
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

//market 

const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "public", "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

app.post("/api/products", upload.single("productImage"), async (req, res) => {
  // Extract fields from the form
  const {
    productName,
    productPrice,
    productQuantity,
    productQuality,
    productKg,
    productDescription,
    contactNumber,
  } = req.body;
  const imagePath = req.file ? "/uploads/" + req.file.filename : "";

  try {
    const maxAllowedKg = 2000;
    const maxAllowedPrice = 20000;
    if (req.body.productKg > maxAllowedKg) {
      return res.send(
        `<script>alert("Please enter a reasonable quantity. Max allowed: 2000 kg per listing."); window.location.href='/sell';</script>`
      );

    } else if(req.body.productPrice > maxAllowedPrice){
       return res.send(
         `<script>alert("Please enter a reasonable Price. Max allowed: ₹20000  per listing."); window.location.href='/sell';</script>`
       );
    }
    else {
      const insertQuery = `
      INSERT INTO products (product_name, price, quantity, quality, kg, description, contact_number, image)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
      const values = [
        productName,
        productPrice,
        productQuantity,
        productQuality,
        productKg,
        productDescription,
        contactNumber,
        imagePath,
      ];
      await db.query(insertQuery, values);
      // Redirect to the market page after successful insertion
      res.redirect("/pages/farmer-market.html");
    }
  } catch (error) {
    console.error("Error inserting product:", error);
    res.status(500).send("Server error");
  }
});
// GET endpoint to fetch all products
app.get("/api/products", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM products ORDER BY id DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Server error");
  }
});

//symtom prediction 
// Route: Handle form submission for image upload, description, and language
app.post('/upload', upload.single('imageInput'), async (req, res) => {
  try {
    const { description, language } = req.body;
    const filePath = req.file.path;
    // Save the form details into the database, including the preferred language
    const query = 'INSERT INTO predictions (image_path, description, language) VALUES ($1, $2, $3) RETURNING id';
    const values = [filePath, description, language];
    const result = await db.query(query, values);
    res.json({ success: true, predictionId: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// /analyze route
app.post("/analyze", async (req, res) => {
  try {
    const { predictionId } = req.body;

    // Retrieve the record from the database
    const dbResult = await db.query("SELECT * FROM predictions WHERE id = $1", [
      predictionId,
    ]);
    if (dbResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Prediction not found" });
    }
    const record = dbResult.rows[0];

    // Construct the image URL.
    // If record.image_path is already a public URL (starts with "http"), use it; otherwise, build one.
    // const imageUrl = record.image_path.startsWith("http")
    //   ? record.image_path
    //   : `${req.protocol}://${req.get("host")}/${record.image_path}`;
const imageUrl =
  "https://1.bp.blogspot.com/-fr7iwyvZ5t8/Xp082pHa5pI/AAAAAAAABBw/DSrN-yg9Lz4K3OjMzYD5gc_GHurIHvcRgCLcBGAsYHQ/s1600/Leaf%2Bspot%2Bdisease.jpg";
    // Construct prompt for Gemini AI.
    // If the image URL is local (contains "localhost"), provide a fallback prompt.
    let prompt;
    if (imageUrl.includes("localhost")) {
      prompt = `
I cannot access local files like the image provided (${imageUrl}). Therefore, I cannot analyze the image directly.
To help diagnose the issue, please provide a publicly accessible image URL (e.g., from Imgur or Cloudinary).
Alternatively, please describe the following details:
- Plant species (what type of plant is it?)
- Location (where is it growing? indoors/outdoors and region)
- Symptoms (describe the black patterns in detail: spots, patches, texture, etc.)
- Recent changes in care or environment (watering, fertilizer, exposure to chemicals)

Based on your description "${record.description}", here is some general advice:

Possible Causes of Black Patterns on Leaves:
- Fungal Diseases (e.g., black spot, anthracnose, sooty mold)
- Bacterial Diseases (leaf blight)
- Pest Infestations (aphids, scale, spider mites)
- Environmental Factors (sunburn, nutrient deficiencies, chemical burns)

General Homemade Remedy for Fungal Issues:
Recipe: Mix 1 teaspoon of baking soda with 1 teaspoon of horticultural (neem) oil in 1 gallon of water. Spray both sides of the affected leaves thoroughly. Test on a small area first.

Detailed Explanation:
- Baking soda helps disrupt fungal cell walls by altering the pH.
- Horticultural oil improves adhesion and may provide additional fungicidal properties.
- Proper watering and air circulation are essential.

Please provide additional details or a publicly accessible image URL for a more specific diagnosis.
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
Format your answer clearly and concisely for easy understanding.
      `;
    }

    // Define the Gemini API URL using an updated model name.
    const GEMINI_MODEL = "models/gemini-1.5-pro-002";
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    // Create an HTTPS agent for improved connection handling
    const httpsAgent = new https.Agent({ keepAlive: true });

    // Make the request to Gemini AI using axios with a 30-second timeout
    const response = await axios.post(
      geminiApiUrl,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000, // 30 seconds timeout
        httpsAgent,
      }
    );

    const geminiResponse = response.data;
    console.log("Gemini AI Full Response:", geminiResponse);

    if (!geminiResponse.candidates || geminiResponse.candidates.length === 0) {
      throw new Error("No response from Gemini AI.");
    }

    // Extract AI response text
    const responseText =
      geminiResponse.candidates[0]?.content?.parts[0]?.text ||
      "No valid response.";

    // Update the database with the AI response
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

// Route: Fetch prediction details for display on the prediction page
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

























//routes
app.get("/login", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/login.html");
});
app.get("/signup", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/signUp.html");
});
app.get("/home", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/homepage.html");
});
app.get("/health", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/health.html");
});
app.get("/sell", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/selling.html");
});
app.get("/market", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/farmer-market.html");
});
app.get("/whichusers", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/whichusers.html");
});
app.get("/signupcus", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/signupcus.html");
});
app.get("/logincus", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/logincus.html");
});
app.get("/predict", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/prediction.html");
});
app.get("/upload", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/symptom.html");
});
//starting server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
app.get("/", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/index.html");
});
