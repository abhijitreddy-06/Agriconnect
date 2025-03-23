// Importing required modules and libraries
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

// Initialize express app and define the port
const app = express();
const port = 3000;

// Files tracing: Determine current file and directory names
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve public static files from designated folders
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "Agriconnect/public")));
app.use("/uploads", express.static("uploads"));

// Configure body parser middleware to handle JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up Postgres connection using environment variables
const db = new pg.Client({
  user: process.env.USER_NAME,
  host: "localhost",
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: 5432,
});

// Connect to the Postgres database and log connection status
db.connect((err) => {
  if (err) {
    console.log("error connecting to postgreSQL");
  } else {
    console.log("connected to postgreSQL");
  }
});

// Route: Handle user signup
app.post("/signup", async (req, res) => {
  try {
    const { username, phone, password } = req.body;
    // Check if all required fields are provided
    if (!username || !phone || !password) {
      return res.send(
        `<script>alert("All fields are required."); window.location.href='/signup';</script>`
      );
    }
    // Validate that phone number is exactly 10 digits
    if (!/^\d{10}$/.test(phone)) {
      return res.send(
        `<script>alert("Phone number must be exactly 10 digits and contain only numbers."); window.location.href='/signup';</script>`
      );
    }
    // Ensure password meets the minimum length requirement
    if (password.length < 6) {
      return res.send(
        `<script>alert("Password must be more than 6 characters."); window.location.href='/signup';</script>`
      );
    }
    // Check if an account with the same phone number already exists
    const existingUser = await db.query(
      "SELECT * FROM signup WHERE phone_no = $1",
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.send(
        `<script>alert("Account already exists."); window.location.href='/signup';</script>`
      );
    }

    // Hash the password before storing in the database for security
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user's data into the database
    const insertQuery = `
      INSERT INTO signup (username, phone_no, password)
      VALUES ($1, $2, $3);
    `;
    await db.query(insertQuery, [username, phone, hashedPassword]);

    // Redirect the user to the homepage upon successful signup
    res.sendFile("/Agriconnect/public/pages/homepage.html");
  } catch (err) {
    console.error("Signup Error:", err);
    res.send(
      `<script>alert("Something went wrong. Please try again."); window.location.href='/signup';</script>`
    );
  }
});

// Route: Handle user login
app.post("/login", async (req, res) => {
  const { phone, password } = req.body;
  try {
    // Check if an account exists with the provided phone number
    const result = await db.query("SELECT * FROM signup WHERE phone_no = $1", [
      phone,
    ]);

    if (result.rows.length === 0) {
      // If no account is found, alert the user and redirect to login
      return res.send(`
        <script>
          alert('Account not found');
          window.location.href="/login";
        </script>
      `);
    }

    const user = result.rows[0];

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      // Redirect to home if passwords match
      return res.redirect("/home");
    } else if (!isMatch) {
      // Alert and redirect if password does not match
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



// Route: Customer signup handling
app.post("/signupcus", async (req, res) => {
  try {
    const { username, phone, password } = req.body;
    // Validate that all required fields are provided
    if (!username || !phone || !password) {
      return res.send(
        `<script>alert("All fields are required."); window.location.href='/signupcus';</script>`
      );
    }
    // Validate phone number format (exactly 10 digits)
    if (!/^\d{10}$/.test(phone)) {
      return res.send(
        `<script>alert("Phone number must be exactly 10 digits and contain only numbers."); window.location.href='/signupcus';</script>`
      );
    }
    // Check for minimum password length
    if (password.length < 6) {
      return res.send(
        `<script>alert("Password must be more than 6 characters."); window.location.href='/signupcus';</script>`
      );
    }
    // Check if an account already exists with the provided phone number
    const existingUser = await db.query(
      "SELECT * FROM cus_signup WHERE phone_no = $1",
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.send(
        `<script>alert("Account already exists."); window.location.href='/signupcus';</script>`
      );
    }

    // Hash the password for secure storage
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new customer details into the database
    const insertQuery = `
      INSERT INTO cus_signup (username, phone_no, password)
      VALUES ($1, $2, $3);
    `;
    await db.query(insertQuery, [username, phone, hashedPassword]);

    // Redirect customer to the customer homepage after signup
    res.sendFile("/Agriconnect/public/pages/homepage_cus.html");
  } catch (err) {
    console.error("Signup Error:", err);
    res.send(
      `<script>alert("Something went wrong. Please try again."); window.location.href='/signupcus';</script>`
    );
  }
});

// Route: Customer login handling
app.post("/logincus", async (req, res) => {
  const { phone, password } = req.body;
  try {
    // Query the customer table for an account with the provided phone number
    const result = await db.query(
      "SELECT * FROM cus_signup WHERE phone_no = $1",
      [phone]
    );

    if (result.rows.length === 0) {
      // Alert and redirect if account not found
      return res.send(`
        <script>
          alert('Account not found');
          window.location.href="/logincus";
        </script>
      `);
    }

    const user = result.rows[0];

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      // Redirect to customer homepage if passwords match
      return res.redirect("/homecus");
    } else if (!isMatch) {
      // Alert and redirect if password is incorrect
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


// Market-related code for handling file uploads and product insertion
const uploadDir = path.join(__dirname, "public", "uploads");
// Check if the upload directory exists; if not, create it
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage settings for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Example: "1679509123456.jpg"
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Route: Handle product submission with file upload
app.post("/api/products", upload.single("productImage"), async (req, res) => {
  // Extract product details from the request body
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

  // Determine the image path if a file was uploaded
  const imagePath = req.file ? "/uploads/" + req.file.filename : "";

  try {
    // Parse the price and quantity as floats (assuming your DB columns are numeric)
    const parsedPrice = parseFloat(productPrice);
    const parsedQuantity = parseFloat(productQuantity);

    // Define maximum allowed values for product quantity and price
    const maxAllowedQuantity = 2000; // e.g., 2000 units
    const maxAllowedPrice = 20000; // e.g., ₹20000

    // Validate product quantity
    if (parsedQuantity > maxAllowedQuantity) {
      return res.send(
        `<script>alert("Please enter a reasonable quantity. Max allowed: ${maxAllowedQuantity} per listing."); window.location.href='/sell';</script>`
      );
    }
    // Validate product price
    else if (parsedPrice > maxAllowedPrice) {
      return res.send(
        `<script>alert("Please enter a reasonable price. Max allowed: ₹${maxAllowedPrice} per listing."); window.location.href='/sell';</script>`
      );
    } else {
      // Insert the product details into the database
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
        priceCurrency, // "₹" or "$"
        quantityUnit, // "kilogram" or "gram"
      ];

      await db.query(insertQuery, values);

      // Redirect to the farmer market page after successful insertion
      res.redirect("/pages/farmer-market.html");
    }
  } catch (error) {
    console.error("Error inserting product:", error);
    res.status(500).send("Server error");
  }
});

// GET endpoint to fetch all products from the database and return them as JSON
app.get("/api/products", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM products ORDER BY id DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Server error");
  }
});

// Symptom prediction: Handle image upload and description submission
app.post("/upload", upload.single("imageInput"), async (req, res) => {
  try {
    const { description, language } = req.body;
    const filePath = req.file.path;
    // Save the image path, description, and language preference into the database
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

// Route: Analyze the uploaded image using Gemini AI for symptom prediction
app.post("/analyze", async (req, res) => {
  try {
    const { predictionId } = req.body;

    // Retrieve the prediction record from the database using its ID
    const dbResult = await db.query("SELECT * FROM predictions WHERE id = $1", [
      predictionId,
    ]);
    if (dbResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Prediction not found" });
    }
    const record = dbResult.rows[0];

    // For demonstration purposes, a hardcoded image URL is used.
    const imageUrl =
      "https://1.bp.blogspot.com/-fr7iwyvZ5t8/Xp082pHa5pI/AAAAAAAABBw/DSrN-yg9Lz4K3OjMzYD5gc_GHurIHvcRgCLcBGAsYHQ/s1600/Leaf%2Bspot%2Bdisease.jpg";

    // Construct the prompt for Gemini AI based on the image URL and record details
    let prompt;
    if (imageUrl.includes("localhost")) {
      // If the image URL is local, provide a fallback prompt for additional details
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
      // Otherwise, construct a detailed prompt including image URL and description
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

    // Define the Gemini AI model and API endpoint
    const GEMINI_MODEL = "models/gemini-1.5-pro-002";
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    // Create an HTTPS agent to manage connections efficiently
    const httpsAgent = new https.Agent({ keepAlive: true });

    // Make the API request to Gemini AI with a 30-second timeout
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

    // Extract the response text from Gemini AI
    const responseText =
      geminiResponse.candidates[0]?.content?.parts[0]?.text ||
      "No valid response.";

    // Update the predictions table with the Gemini AI response
    await db.query("UPDATE predictions SET gemini_details = $1 WHERE id = $2", [
      responseText,
      predictionId,
    ]);

    // Return the AI-generated details as JSON
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

// Route: Fetch prediction details based on prediction ID for display
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


// const LARA_ACCESS_KEY_ID = "ABC123..."; // Replace with your Access Key ID
// const LARA_ACCESS_KEY_SECRET = "aBc123..."; // Replace with your Access Key SECRET

// const credentials = new Credentials(LARA_ACCESS_KEY_ID, LARA_ACCESS_KEY_SECRET);
// const lara = new Translator(credentials);

// async function main() {
//   // This translates your text from English ("en-US") to Italian ("it-IT").
//   const res = await lara.translate(
//     "Hello, how are you? This text can be very long.",
//     "en-US",
//     "it-IT"
//   );

//   // Prints the translated text: "Ciao, come stai? Questo testo può essere molto lungo."
//   console.log(res.translation);
// }

// main().finally(() => console.log("Done!"));
































// Define routes to serve various HTML pages

// Route: Serve login page
app.get("/login", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/login.html");
});

// Route: Serve signup page
app.get("/signup", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/signUp.html");
});

// Route: Serve homepage after login/signup
app.get("/home", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/homepage.html");
});

// Route: Serve homepage for customer after login/signup
app.get("/homecus", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/homepage_cus.html");
});
// Route: Serve health-related page
app.get("/health", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/health.html");
});

// Route: Serve selling page for product listings
app.get("/sell", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/selling.html");
});

// Route: Serve farmer market page
app.get("/market", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/farmer-market.html");
});

// Route: Serve customer market page
app.get("/marketcus", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/farmer-market_cus.html");
});

// Route: Serve a page to display different types of users
app.get("/whichusers", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/whichusers.html");
});

// Route: Serve customer signup page
app.get("/signupcus", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/signupcus.html");
});

// Route: Serve customer login page
app.get("/logincus", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/logincus.html");
});

// Route: Serve prediction page
app.get("/predict", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/prediction.html");
});

// Route: Serve symptom upload page
app.get("/upload", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/symptom.html");
});

// Start the server and listen on the defined port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Default route: Serve the index page
app.get("/", (req, res) => {
  res.sendFile("/Agriconnect/public/pages/index.html");
});
