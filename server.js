import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for all routes
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB connection
const uri = process.env.MONGODB_URI;
mongoose
  .connect(uri)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });


  

const movieSchema = new mongoose.Schema({
  movie_name: { type: String, required: true },
  movie_rating: { type: String, required: true },
  description: { type: String, required: true },

  image: {
    type: Buffer, // Store the image as a binary BLOB (Buffer)
    required: true,
  },
  contentType: {
    type: String, // Store the image MIME type, e.g., 'image/png'
    required: true,
  },
  
});

const Movie = mongoose.model("Movie", movieSchema);

// Multer configuration to store images in memory (as Buffer)

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route to handle image upload and store it in MongoDB
app.post("/api/movie", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Image file is required." });
  }

  const { movie_name, movie_rating, description } = req.body;

  if (!movie_name || !movie_rating || !description) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const parsedRating = parseFloat(movie_rating); // Convert movie_rating to a number
  if (isNaN(parsedRating)) {
    return res.status(400).json({ message: "movie_rating must be a valid number." });
  }

  // Create a new movie with image data stored as Buffer (BLOB)
  const newMovie = new Movie({
    movie_name,
    movie_rating: parsedRating,
    description,
    image: req.file.buffer, // Store the image as a Buffer (BLOB)
    contentType: req.file.mimetype || "application/octet-stream", // Default MIME type
  });

  try {
    const savedMovie = await newMovie.save();
    res.status(201).json(savedMovie);
  } catch (error) {
    res.status(400).json({ message: "Error creating movie", error });
  }
});

// Route to get all movies with image data
app.get("/api/movie", async (req, res) => {
  try {
    const limit = Number(req.query.limit);
    const movies = limit ? await Movie.find().limit(limit) : await Movie.find();
    res.status(200).json(movies);
  } catch (err) {
    res.status(500).json({ message: "Error fetching movies", err });
  }
});

// Route to get a movie by ID with image data
app.get("/api/movie/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    // Convert image buffer to base64 string for easy client-side rendering
    const base64Image = movie.image.toString("base64");

    res.json({
      ...movie.toObject(),
      image: `data:${movie.contentType};base64,${base64Image}`,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching movie", error });
  }
});

// Route to update a movie by ID (with image update support)
app.put("/api/movie/:id", upload.single("image"), async (req, res) => {
  try {
    const updates = req.body;
    if (req.file) {
      updates.image = req.file.buffer; // Update the image as Buffer (BLOB)
      updates.contentType = req.file.mimetype;
    }

    const updatedMovie = await Movie.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    if (!updatedMovie) {
      return res.status(404).json({ message: `Movie with ID ${req.params.id} not found` });
    }

    res.status(200).json(updatedMovie);
  } catch (error) {
    res.status(500).json({ message: "Error updating movie", error });
  }
});

// Route to delete a movie by ID
app.delete("/api/movie/:id", async (req, res) => {
  try {
    const deletedMovie = await Movie.findByIdAndDelete(req.params.id);

    if (!deletedMovie) {
      return res.status(404).json({ message: `Movie with ID ${req.params.id} not found` });
    }

    res.status(200).json({ message: `Movie with ID ${req.params.id} deleted` });
  } catch (error) {
    res.status(500).json({ message: "Error deleting movie", error });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


// MongoDB schema for storing image data as BLOB
// const productSchema = new mongoose.Schema({
//   prd_name: { type: String, required: true },
//   prd_price: { type: Number, required: true },
//   prd_desc: { type: String, required: true },
//   image: {
//     type: Buffer, // Store the image as a binary BLOB (Buffer)
//     required: true,
//   },
//   contentType: {
//     type: String, // Store the image MIME type, e.g., 'image/png'
//     required: true,
//   },
//   uploadedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// const Product = mongoose.model("Product", productSchema);

// // Multer configuration to store images in memory (as Buffer)
// const storage = multer.memoryStorage();
// const upload = multer({ storage });

// // Route to handle image upload and store it in MongoDB
// app.post("/api/product", upload.single("image"), async (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ message: "Image file is required." });
//   }

//   const { prd_name, prd_price, prd_desc } = req.body;

//   if (!prd_name || !prd_price || !prd_desc) {
//     return res.status(400).json({ message: "All fields are required." });
//   }

//   const parsedPrice = parseFloat(prd_price); // Convert prd_price to a number
//   if (isNaN(parsedPrice)) {
//     return res.status(400).json({ message: "prd_price must be a valid number." });
//   }

//   // Create a new product with image data stored as Buffer (BLOB)
//   const newProduct = new Product({
//     prd_name,
//     prd_price: parsedPrice,
//     prd_desc,
//     image: req.file.buffer, // Store the image as a Buffer (BLOB)
//     contentType: req.file.mimetype || "application/octet-stream", // Default MIME type
//   });

//   try {
//     const savedProduct = await newProduct.save();
//     res.status(201).json(savedProduct);
//   } catch (error) {
//     res.status(400).json({ message: "Error creating product", error });
//   }
// });

// // Route to get all products with image data
// app.get("/api/product", async (req, res) => {
//   try {
//     const limit = Number(req.query.limit);
//     const products = limit ? await Product.find().limit(limit) : await Product.find();
//     res.status(200).json(products);
//   } catch (err) {
//     res.status(500).json({ message: "Error fetching products", err });
//   }
// });

// // Route to get a product by ID with image data
// app.get("/api/product/:id", async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id);
//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     // Convert image buffer to base64 string for easy client-side rendering
//     const base64Image = product.image.toString("base64");

//     res.json({
//       ...product.toObject(),
//       image: `data:${product.contentType};base64,${base64Image}`,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching product", error });
//   }
// });

// // Route to update a product by ID (with image update support)
// app.put("/api/product/:id", upload.single("image"), async (req, res) => {
//   try {
//     const updates = req.body;
//     if (req.file) {
//       updates.image = req.file.buffer; // Update the image as Buffer (BLOB)
//       updates.contentType = req.file.mimetype;
//     }

//     const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updates, {
//       new: true,
//     });

//     if (!updatedProduct) {
//       return res.status(404).json({ message: `Product with ID ${req.params.id} not found` });
//     }

//     res.status(200).json(updatedProduct);
//   } catch (error) {
//     res.status(500).json({ message: "Error updating product", error });
//   }
// });

// // Route to delete a product by ID
// app.delete("/api/product/:id", async (req, res) => {
//   try {
//     const deletedProduct = await Product.findByIdAndDelete(req.params.id);

//     if (!deletedProduct) {
//       return res.status(404).json({ message: `Product with ID ${req.params.id} not found` });
//     }

//     res.status(200).json({ message: `Product with ID ${req.params.id} deleted` });
//   } catch (error) {
//     res.status(500).json({ message: "Error deleting product", error });
//   }
// });

// // Start the server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });